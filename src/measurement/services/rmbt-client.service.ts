import { MeasurementThreadResult } from "../dto/measurement-thread-result.dto"
import { EMeasurementStatus } from "../enums/measurement-status.enum"
import { IMeasurementRegistrationResponse } from "../interfaces/measurement-registration-response.interface"
import {
    IMeasurementThreadResult,
    IPing,
    ISpeedItem,
} from "../interfaces/measurement-result.interface"
import {
    IncomingMessageWithData,
    RMBTWorker,
} from "../interfaces/rmbt-worker.interface"
import { Logger } from "./logger.service"
import { RMBTWorkerFactory } from "./rmbt-worker-factory.service"
import { Time } from "./time.service"
import path from "path"
import { IOverallResult } from "../interfaces/overall-result.interface"
import { IPreDownloadResult } from "./rmbt-thread.service"
import { MeasurementResult } from "../dto/measurement-result.dto"

export type TransferDirection = "down" | "up"

export class RMBTClient {
    static minChunkSize = 4096
    static maxChunkSize = 4194304

    static getOverallPings(
        pings: {
            ping_ms: number
            time_elapsed: number
        }[]
    ): IPing[] {
        if (!pings?.length) {
            return []
        }
        return pings.map((p) => ({
            time_ns: p.time_elapsed * 1e6,
            value: p.ping_ms * 1e6,
            value_server: p.ping_ms * 1e6,
        }))
    }

    static getOverallResultsFromSpeedCurve(
        curve: {
            bytes_total: number
            time_elapsed: number
        }[]
    ): IOverallResult[] {
        if (!curve?.length) {
            return []
        }
        return curve.map((ci) => ({
            bytes: ci.bytes_total,
            nsec: ci.time_elapsed * 1e6,
            speed: (ci.bytes_total * 8) / (ci.time_elapsed / 1e3),
        }))
    }

    static getOverallResultsFromSpeedItems(
        speedItems: ISpeedItem[],
        direction: "download" | "upload"
    ): IOverallResult[] {
        if (!speedItems) {
            return []
        }
        const key: TransferDirection = direction === "download" ? "down" : "up"
        const threadResultsMap: { [key: number]: IMeasurementThreadResult } = {}
        for (const speedItem of speedItems) {
            const index = speedItem.thread
            if (!threadResultsMap[index]) {
                threadResultsMap[index] = new MeasurementThreadResult(index)
            }
            if (speedItem.direction === "download") {
                threadResultsMap[index].down.bytes.push(speedItem.bytes)
                threadResultsMap[index].down.nsec.push(speedItem.time)
            } else if (speedItem.direction === "upload") {
                threadResultsMap[index].up.bytes.push(speedItem.bytes)
                threadResultsMap[index].up.nsec.push(speedItem.time)
            }
        }
        const threadResults = Object.values(threadResultsMap)
            .filter((threadResult) => !!threadResult[key].bytes.length)
            .sort((a, b) => b[key].bytes.length - a[key].bytes.length)
        const overallResults: IOverallResult[] = []
        const longestThread = threadResults[0]
        for (let i = 1; i <= longestThread[key].bytes.length; i++) {
            const threadsSlice = threadResults.map((threadResult) => {
                const newResult = new MeasurementThreadResult(
                    threadResult.index
                )
                newResult[key].nsec = threadResult[key].nsec.slice(0, i)
                newResult[key].bytes = threadResult[key].bytes.slice(0, i)
                return newResult
            })
            overallResults.push(this.getFineResult(threadsSlice, key))
        }
        return overallResults
    }

    static getCoarseResult(
        threads: IMeasurementThreadResult[],
        resultKey: TransferDirection
    ): IOverallResult {
        let bytes = 0
        let minNsec = Infinity
        let maxNsec = 0

        for (const task of threads) {
            if (
                !(
                    task &&
                    task.currentTime?.[resultKey] >= 0 &&
                    task.currentTransfer?.[resultKey] >= 0
                )
            ) {
                continue
            }
            if (task.currentTime[resultKey] < minNsec) {
                minNsec = task.currentTime[resultKey]
            }
            if (task.currentTime[resultKey] > maxNsec) {
                maxNsec = task.currentTime[resultKey]
            }
            bytes += task.currentTransfer[resultKey]
        }

        const nsec = (maxNsec - minNsec) / 2 + minNsec

        let speed = (bytes / nsec) * 1e9 * 8.0
        speed = nsec === 0 ? 0 : isNaN(speed) ? 0 : speed
        return {
            bytes,
            nsec,
            speed,
        }
    }

    // From https://github.com/rtr-nettest/rmbtws/blob/master/src/WebsockettestDatastructures.js#L177
    static getFineResult(
        threads: IMeasurementThreadResult[],
        resultKey: TransferDirection
    ): IOverallResult {
        let targetTime = Infinity

        for (const task of threads) {
            if (!task) {
                continue
            }
            let nsecs = task[resultKey].nsec
            if (nsecs.length > 0) {
                if (nsecs[nsecs.length - 1] < targetTime) {
                    targetTime = nsecs[nsecs.length - 1]
                }
            }
        }

        let totalBytes = 0

        for (const task of threads) {
            if (!task) {
                continue
            }
            let phasedThreadNsec = task[resultKey].nsec
            let phasedThreadBytes = task[resultKey].bytes
            let phasedLength = phasedThreadNsec.length

            if (phasedLength > 0) {
                let targetIdx = phasedLength
                for (let j = 0; j < phasedLength; j++) {
                    if (phasedThreadNsec[j] >= targetTime) {
                        targetIdx = j
                        break
                    }
                }
                let calcBytes = 0
                if (phasedThreadNsec[targetIdx] === targetTime) {
                    // nsec[max] == targetTime
                    calcBytes = phasedThreadBytes[phasedLength - 1]
                } else {
                    let bytes1 =
                        targetIdx === 0 ? 0 : phasedThreadBytes[targetIdx - 1]
                    let bytes2 = phasedThreadBytes[targetIdx]
                    let bytesDiff = bytes2 - bytes1
                    let nsec1 =
                        targetIdx === 0 ? 0 : phasedThreadNsec[targetIdx - 1]
                    let nsec2 = phasedThreadNsec[targetIdx]
                    let nsecDiff = nsec2 - nsec1
                    let nsecCompensation = targetTime - nsec1
                    let factor = nsecCompensation / nsecDiff
                    let compensation = Math.round(bytesDiff * factor)

                    if (compensation < 0) {
                        compensation = 0
                    }
                    calcBytes = bytes1 + compensation
                }
                totalBytes += calcBytes
            }
        }
        return {
            bytes: totalBytes,
            nsec: targetTime,
            speed: (totalBytes * 8) / (targetTime / 1e9),
        }
    }

    finalResultDown?: IOverallResult
    finalResultUp?: IOverallResult
    measurementLastUpdate?: number
    measurementStatus: EMeasurementStatus = EMeasurementStatus.WAIT
    measurementTasks: RMBTWorker[] = []
    params: IMeasurementRegistrationResponse
    initializedThreads: number[] = []
    interimThreadResults: IMeasurementThreadResult[] = []
    threadResults: IMeasurementThreadResult[] = []
    downThreadResults: IMeasurementThreadResult[] = []
    upThreadResults: IMeasurementThreadResult[] = []
    chunks: number[] = []
    timestamps: { index: number; time: number }[] = []
    pingMedian = -1
    measurementStart: number = 0
    isRunning = false
    activityInterval?: NodeJS.Timer
    aborter = new AbortController()
    pings: IPing[] = []
    private bytesPerSecPreDownload: number[] = []
    private estimatePhaseDuration: { [key: string]: number } = {
        [EMeasurementStatus.INIT]: 0.5,
        [EMeasurementStatus.INIT_DOWN]: 2.5,
        [EMeasurementStatus.PING]: 1.5,
        [EMeasurementStatus.DOWN]: -1,
        [EMeasurementStatus.INIT_UP]: 5,
        [EMeasurementStatus.UP]: -1,
    }
    private phaseStartTimeNs: { [key: string]: number } = {
        [EMeasurementStatus.INIT]: -1,
        [EMeasurementStatus.INIT_DOWN]: -1,
        [EMeasurementStatus.PING]: -1,
        [EMeasurementStatus.DOWN]: -1,
        [EMeasurementStatus.INIT_UP]: -1,
        [EMeasurementStatus.UP]: -1,
    }
    private lastMessageReceivedAt = 0

    get interimDownMbps() {
        return (
            (RMBTClient.getCoarseResult(this.interimThreadResults, "down")
                .speed ?? 0) / 1e6
        )
    }

    get interimUpMbps() {
        return (
            (RMBTClient.getCoarseResult(this.interimThreadResults, "up")
                .speed ?? 0) / 1e6
        )
    }

    get finalDownMbps() {
        return (this.finalResultDown?.speed ?? 0) / 1e6
    }

    get finalUpMbps() {
        return (this.finalResultUp?.speed ?? 0) / 1e6
    }

    constructor(params: IMeasurementRegistrationResponse) {
        this.params = params
        this.estimatePhaseDuration[EMeasurementStatus.DOWN] = Number(
            params.test_duration
        )
        this.estimatePhaseDuration[EMeasurementStatus.UP] = Number(
            params.test_duration
        )
    }

    getPhaseDuration(phase: string) {
        return (Time.nowNs() - this.phaseStartTimeNs[phase]) / 1e9
    }

    getPhaseProgress(phase: string) {
        const estimatePhaseDuration = this.estimatePhaseDuration[phase] ?? -1
        return Math.min(1, this.getPhaseDuration(phase) / estimatePhaseDuration)
    }

    async scheduleMeasurement(): Promise<IMeasurementThreadResult[]> {
        Logger.I.info("Scheduling measurement...")
        this.measurementLastUpdate = new Date().getTime()
        if (this.params.test_wait > 0) {
            this.measurementStatus = EMeasurementStatus.WAIT
            return new Promise((resolve) => {
                setTimeout(async () => {
                    resolve(await this.runMeasurement())
                }, this.params.test_wait * 1000)
            })
        } else {
            return this.runMeasurement()
        }
    }

    private finishMeasurement(
        resolve: (
            value:
                | IMeasurementThreadResult[]
                | PromiseLike<IMeasurementThreadResult[]>
        ) => void
    ) {
        if (!this.isRunning) {
            return
        }
        try {
            this.finalResultUp = RMBTClient.getFineResult(
                this.threadResults,
                "up"
            )
            this.upThreadResults = [...this.threadResults]
        } finally {
            Logger.I.info(
                "Upload is finished in %ds",
                this.getPhaseDuration(EMeasurementStatus.UP)
            )
            Logger.I.info("The total upload speed is %dMbps", this.finalUpMbps)
            clearInterval(this.activityInterval)
            this.threadResults = []
            this.interimThreadResults = new Array(this.params.test_numthreads)
            for (const w of this.measurementTasks) {
                w.terminate()
            }
            if (this.measurementStatus !== EMeasurementStatus.ABORTED) {
                Logger.I.info("Measurement is finished. Submitting results.")
                this.measurementStatus = EMeasurementStatus.SUBMITTING_RESULTS
            } else {
                Logger.I.info(
                    "Measurement is aborted. Submitting the information."
                )
            }
            this.isRunning = false
            resolve([...this.downThreadResults, ...this.upThreadResults])
        }
    }

    abortMeasurement() {
        this.aborter.abort()
    }

    private cancelMeasurement(reject: (reason: any) => void, error?: Error) {
        if (!this.isRunning) {
            return
        }
        clearInterval(this.activityInterval)
        this.threadResults = []
        this.interimThreadResults = new Array(this.params.test_numthreads)
        this.isRunning = false
        for (const w of this.measurementTasks) {
            w.terminate()
        }

        if (error) {
            Logger.I.error(error)
            this.measurementStatus = EMeasurementStatus.ERROR
            reject(error)
        } else {
            this.measurementStatus = EMeasurementStatus.ABORTED
            reject(null)
        }
    }

    private async runMeasurement(): Promise<IMeasurementThreadResult[]> {
        this.isRunning = true
        this.measurementStart = Date.now()
        return new Promise((resolve, reject) => {
            Logger.I.info("Running measurement...")
            let allowedInactivityMs = Number(process.env.ALLOWED_INACTIVITY_MS)
            if (isNaN(allowedInactivityMs)) {
                allowedInactivityMs = 10000
            }
            this.activityInterval = setInterval(() => {
                if (
                    Date.now() - this.lastMessageReceivedAt >=
                    allowedInactivityMs
                ) {
                    this.cancelMeasurement(
                        reject,
                        new Error("Measurement timed out")
                    )
                }
            }, allowedInactivityMs)
            this.measurementStatus = EMeasurementStatus.INIT
            this.interimThreadResults = new Array(this.params.test_numthreads)
            this.phaseStartTimeNs[EMeasurementStatus.INIT] = Time.nowNs()
            for (let i = 0; i < this.params.test_numthreads; i++) {
                const worker = RMBTWorkerFactory.getWorker(
                    path.join(__dirname, "worker.service.js"),
                    {
                        workerData: {
                            params: this.params,
                            index: i,
                            result: new MeasurementThreadResult(i),
                        },
                    }
                )
                if (worker) {
                    this.measurementTasks.push(worker)
                }
            }
            for (const [index, worker] of this.measurementTasks.entries()) {
                worker.postMessage(new IncomingMessageWithData("connect"))
                worker.on("message", (message) => {
                    if (this.aborter.signal.aborted) {
                        this.measurementStatus = EMeasurementStatus.ABORTED
                        this.finishMeasurement(resolve)
                        return
                    }
                    this.lastMessageReceivedAt = Date.now()
                    switch (message.message) {
                        case "error":
                            this.cancelMeasurement(
                                reject,
                                message.data as Error
                            )
                            break
                        case "connected":
                            if (!!message.data) {
                                this.initializedThreads.push(index)
                            }
                            if (
                                this.initializedThreads.length ===
                                this.measurementTasks.length
                            ) {
                                for (const w of this.measurementTasks) {
                                    w.postMessage(
                                        new IncomingMessageWithData(
                                            "preDownload"
                                        )
                                    )
                                }
                                this.initializedThreads = []
                                this.measurementStatus =
                                    EMeasurementStatus.INIT_DOWN
                                this.phaseStartTimeNs[
                                    EMeasurementStatus.INIT_DOWN
                                ] = Time.nowNs()
                                Logger.I.warn(
                                    "Init is finished in %d s",
                                    this.getPhaseDuration(
                                        EMeasurementStatus.INIT
                                    )
                                )
                            }
                            break
                        case "preDownloadFinished":
                            const { chunkSize, bytesPerSec } =
                                message.data as IPreDownloadResult
                            this.chunks.push(chunkSize)
                            this.bytesPerSecPreDownload.push(bytesPerSec)
                            Logger.I.warn(
                                "Worker %d finished pre-download with speed %d and chunk size %d.",
                                index,
                                bytesPerSec,
                                chunkSize
                            )
                            if (
                                this.chunks.length ===
                                this.measurementTasks.length
                            ) {
                                this.checkIfShouldUseOneThread(this.chunks)
                                this.measurementTasks[0].postMessage(
                                    new IncomingMessageWithData("ping")
                                )
                                this.chunks = []
                                this.measurementStatus = EMeasurementStatus.PING
                                this.phaseStartTimeNs[EMeasurementStatus.PING] =
                                    Time.nowNs()
                                Logger.I.warn(
                                    "Pre-download is finished in %d s",
                                    this.getPhaseDuration(
                                        EMeasurementStatus.INIT_DOWN
                                    )
                                )
                            }
                            break
                        case "pingFinished":
                            this.pingMedian =
                                ((message.data! as IMeasurementThreadResult)
                                    .ping_median ?? -1000000) / 1000000
                            this.pings = MeasurementResult.getPings([
                                message.data! as IMeasurementThreadResult,
                            ])
                            const calculatedChunkSize = this.getChunkSize()
                            for (const w of this.measurementTasks) {
                                w.postMessage(
                                    new IncomingMessageWithData(
                                        "download",
                                        calculatedChunkSize
                                    )
                                )
                            }
                            this.measurementStatus = EMeasurementStatus.DOWN
                            this.phaseStartTimeNs[EMeasurementStatus.DOWN] =
                                Time.nowNs()
                            Logger.I.info(
                                "The ping median is %dms.",
                                this.pingMedian
                            )
                            Logger.I.warn(
                                "Ping is finished in %d s",
                                this.getPhaseDuration(EMeasurementStatus.PING)
                            )
                            break
                        case "downloadUpdated":
                            this.interimThreadResults[index] =
                                message.data! as IMeasurementThreadResult
                            break
                        case "downloadFinished":
                            this.threadResults.push(
                                message.data! as IMeasurementThreadResult
                            )
                            if (
                                this.threadResults.length ===
                                this.measurementTasks.length
                            ) {
                                this.finalResultDown = RMBTClient.getFineResult(
                                    this.threadResults,
                                    "down"
                                )
                                this.downThreadResults = [...this.threadResults]
                                this.threadResults = []
                                this.interimThreadResults = new Array(
                                    this.params.test_numthreads
                                )
                                for (const w of this.measurementTasks) {
                                    w.postMessage(
                                        new IncomingMessageWithData("preUpload")
                                    )
                                }
                                this.measurementStatus =
                                    EMeasurementStatus.INIT_UP
                                this.phaseStartTimeNs[
                                    EMeasurementStatus.INIT_UP
                                ] = Time.nowNs()
                                Logger.I.info(
                                    "Download is finished in %ds",
                                    this.getPhaseDuration(
                                        EMeasurementStatus.DOWN
                                    )
                                )
                                Logger.I.info(
                                    "The total download speed is %dMbps",
                                    this.finalDownMbps
                                )
                            }
                            break
                        case "preUploadFinished":
                            this.chunks.push(message.data as number)
                            Logger.I.warn(
                                "Worker %d finished pre-upload with %o chunk sizes.",
                                index,
                                this.chunks
                            )
                            if (
                                this.chunks.length ===
                                this.measurementTasks.length
                            ) {
                                this.checkIfShouldUseOneThread(this.chunks)
                                for (const w of this.measurementTasks) {
                                    w.postMessage(
                                        new IncomingMessageWithData(
                                            "reconnectForUpload"
                                        )
                                    )
                                }
                                this.chunks = []
                                this.measurementStatus = EMeasurementStatus.UP
                                this.phaseStartTimeNs[EMeasurementStatus.UP] =
                                    Time.nowNs()
                                Logger.I.info(
                                    "Pre-upload is finished in %ds",
                                    this.getPhaseDuration(
                                        EMeasurementStatus.INIT_UP
                                    )
                                )
                            }
                            break
                        case "reconnectedForUpload":
                            const isReconnected = message.data as boolean
                            if (isReconnected) {
                                Logger.I.warn(
                                    "Worker %d is ready for upload.",
                                    index
                                )
                                this.initializedThreads.push(index)
                            } else {
                                Logger.I.warn(
                                    "Worker %d errored out. Reattempting connection.",
                                    index
                                )
                                setImmediate(() => {
                                    worker.postMessage(
                                        new IncomingMessageWithData(
                                            "reconnectForUpload"
                                        )
                                    )
                                })
                            }
                            if (
                                this.initializedThreads.length ===
                                this.measurementTasks.length
                            ) {
                                const calculatedUpChunkSize =
                                    this.getChunkSize()
                                this.initializedThreads = []
                                for (const w of this.measurementTasks) {
                                    w.postMessage(
                                        new IncomingMessageWithData(
                                            "upload",
                                            calculatedUpChunkSize
                                        )
                                    )
                                }
                            }
                            break
                        case "uploadUpdated":
                            this.interimThreadResults[index] =
                                message.data! as IMeasurementThreadResult
                            break
                        case "uploadFinished":
                            this.threadResults.push(
                                message.data! as IMeasurementThreadResult
                            )
                            if (
                                this.threadResults.length ===
                                this.measurementTasks.length
                            ) {
                                this.finishMeasurement(resolve)
                            }
                            break
                    }
                })
            }
        })
    }

    private checkIfShouldUseOneThread(chunkNumbers: number[]) {
        Logger.I.info("Checking if should use one thread.")
        const threadWithLowestChunkNumber = chunkNumbers.findIndex(
            (c) => c <= 4
        )
        if (threadWithLowestChunkNumber >= 0) {
            Logger.I.info("Switching to one thread.")
            this.measurementTasks = this.measurementTasks.reduce(
                (acc, mt, index) => {
                    if (index === 0) {
                        return [mt]
                    }
                    mt.terminate()
                    return acc
                },
                [] as RMBTWorker[]
            )
        }
    }

    private getChunkSize() {
        const bytesPerSecTotal = this.bytesPerSecPreDownload.reduce(
            (acc, bytes) => acc + bytes,
            0
        )

        // set chunk size to accordingly 1 chunk every n/20 ms on average with n threads
        let chunkSize = Math.floor(
            bytesPerSecTotal / this.params.test_numthreads / (1000 / 20)
        )

        Logger.I.warn("Calculated chunk size is %d", chunkSize)

        //but min 4KiB
        chunkSize = Math.max(RMBTClient.minChunkSize, chunkSize)

        //and max MAX_CHUNKSIZE
        chunkSize = Math.min(RMBTClient.maxChunkSize, chunkSize)

        Logger.I.warn("Setting chunk size to %d", chunkSize)

        return chunkSize
    }
}
