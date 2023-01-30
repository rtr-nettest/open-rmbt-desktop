import { MeasurementThreadResult } from "../dto/measurement-thread-result.dto"
import { EMeasurementStatus } from "../enums/measurement-status.enum"
import { IMeasurementRegistrationResponse } from "../interfaces/measurement-registration-response.interface"
import {
    IMeasurementThreadResult,
    IMeasurementThreadResultList,
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

export class RMBTClient {
    static getOverallResultsFromSpeedItems(
        speedItems: ISpeedItem[],
        direction: "download" | "upload"
    ): IOverallResult[] {
        if (!speedItems) {
            return []
        }
        const key = direction === "download" ? "down" : "up"
        const threadResultsMap: { [key: number]: IMeasurementThreadResult } = {}
        for (const speedItem of speedItems) {
            const index = speedItem.thread
            if (!threadResultsMap[index]) {
                threadResultsMap[index] = new MeasurementThreadResult()
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
        const overallResults: IOverallResult[] = []
        const shortestThread = threadResults.sort(
            (a, b) => a[key].bytes.length - b[key].bytes.length
        )[0]
        for (let i = 1; i <= shortestThread[key].bytes.length; i++) {
            const threadsSlice = threadResults.map((threadResult) => {
                const newResult = new MeasurementThreadResult()
                newResult[key].nsec = threadResult[key].nsec.slice(0, i)
                newResult[key].bytes = threadResult[key].bytes.slice(0, i)
                return newResult
            })
            overallResults.push(
                this.getOverallResult(
                    threadsSlice,
                    (threadResult) => threadResult[key]
                )
            )
        }
        return overallResults
    }

    // From https://github.com/rtr-nettest/rmbtws/blob/master/src/WebsockettestDatastructures.js#L177
    static getOverallResult(
        threads: IMeasurementThreadResult[],
        phaseResults: (
            thread: IMeasurementThreadResult
        ) => IMeasurementThreadResultList
    ): IOverallResult {
        let numThreads = threads.length
        let targetTime = Infinity

        for (let i = 0; i < numThreads; i++) {
            if (!phaseResults(threads[i])) {
                continue
            }
            let nsecs = phaseResults(threads[i]).nsec
            if (nsecs.length > 0) {
                if (nsecs[nsecs.length - 1] < targetTime) {
                    targetTime = nsecs[nsecs.length - 1]
                }
            }
        }

        let totalBytes = 0

        for (let _i = 0; _i < numThreads; _i++) {
            if (!phaseResults(threads[_i])) {
                continue
            }
            let thread = threads[_i]
            let phasedThreadNsec = phaseResults(thread).nsec
            let phasedThreadBytes = phaseResults(thread).bytes
            let phasedLength = phasedThreadNsec.length

            if (thread !== null && phasedLength > 0) {
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

    measurementLastUpdate?: number
    measurementStatus: EMeasurementStatus = EMeasurementStatus.WAIT
    measurementTasks: RMBTWorker[] = []
    minChunkSize = 0
    maxChunkSize = 4194304
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
    overallResultDown?: IOverallResult
    overallResultUp?: IOverallResult
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

    get downloadSpeedTotalMbps() {
        return (this.overallResultDown?.speed ?? 0) / 1e6
    }

    get uploadSpeedTotalMbps() {
        return (this.overallResultUp?.speed ?? 0) / 1e6
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

    private async runMeasurement(): Promise<IMeasurementThreadResult[]> {
        this.isRunning = true
        this.measurementStart = Date.now()
        return new Promise((finishMeasurement) => {
            Logger.I.info("Running measurement...")
            this.activityInterval = setInterval(() => {
                if (
                    !this.isRunning ||
                    Date.now() - this.measurementStart >= 60000
                ) {
                    this.overallResultUp = RMBTClient.getOverallResult(
                        this.threadResults,
                        (threadResult) => threadResult?.up
                    )
                    this.upThreadResults = [...this.threadResults]
                    this.threadResults = []
                    this.interimThreadResults = new Array(
                        this.params.test_numthreads
                    )
                    for (const w of this.measurementTasks) {
                        w.terminate()
                    }
                    clearInterval(this.activityInterval)
                    finishMeasurement([
                        ...this.downThreadResults,
                        ...this.upThreadResults,
                    ])
                    this.measurementStatus = EMeasurementStatus.SPEEDTEST_END
                    this.phaseStartTimeNs[EMeasurementStatus.SPEEDTEST_END] =
                        Time.nowNs()
                    Logger.I.info(
                        `Upload is finished in ${this.getPhaseDuration(
                            EMeasurementStatus.UP
                        )}s`
                    )
                    Logger.I.info(
                        `The total upload speed is ${this.uploadSpeedTotalMbps}Mbps`
                    )
                    Logger.I.info("Measurement is finished")
                }
            }, 1000)
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
                            result: new MeasurementThreadResult(),
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
                    switch (message.message) {
                        case "connected":
                            const isInitialized = message.data as boolean
                            if (isInitialized) {
                                Logger.I.warn(`Worker ${index} is ready`)
                                this.initializedThreads.push(index)
                            } else {
                                Logger.I.warn(
                                    `Worker ${index} errored out. Reattempting connection.`
                                )
                                setImmediate(() => {
                                    worker.postMessage(
                                        new IncomingMessageWithData("connect")
                                    )
                                })
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
                                `Worker ${index} finished pre-download with ${this.chunks} speeds.`
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
                                `The ping median is ${this.pingMedian}ms.`
                            )
                            Logger.I.warn(
                                "Ping is finished in %d s",
                                this.getPhaseDuration(EMeasurementStatus.PING)
                            )
                            break
                        case "downloadUpdated":
                            this.interimThreadResults[index] =
                                message.data! as IMeasurementThreadResult
                            this.overallResultDown =
                                RMBTClient.getOverallResult(
                                    this.interimThreadResults,
                                    (threadResult) => threadResult?.down
                                )
                            break
                        case "downloadFinished":
                            this.threadResults.push(
                                message.data! as IMeasurementThreadResult
                            )
                            if (
                                this.threadResults.length ===
                                this.measurementTasks.length
                            ) {
                                this.overallResultDown =
                                    RMBTClient.getOverallResult(
                                        this.threadResults,
                                        (threadResult) => threadResult?.down
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
                                    `Download is finished in ${this.getPhaseDuration(
                                        EMeasurementStatus.DOWN
                                    )}s`
                                )
                                Logger.I.info(
                                    `The total download speed is ${this.downloadSpeedTotalMbps}Mbps`
                                )
                            }
                            break
                        case "preUploadFinished":
                            this.chunks.push(message.data as number)
                            Logger.I.warn(
                                `Worker ${index} finished pre-upload with ${this.chunks} chunks.`
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
                                    `Pre-upload is finished in ${this.getPhaseDuration(
                                        EMeasurementStatus.INIT_UP
                                    )}s`
                                )
                            }
                            break
                        case "reconnectedForUpload":
                            const isReconnected = message.data as boolean
                            if (isReconnected) {
                                Logger.I.warn(
                                    `Worker ${index} is reconnected for upload.`
                                )
                                this.initializedThreads.push(index)
                            } else {
                                Logger.I.warn(
                                    `Worker ${index} errored out. Reattempting connection.`
                                )
                                setImmediate(() => {
                                    worker.postMessage(
                                        new IncomingMessageWithData("connect")
                                    )
                                })
                            }
                            if (
                                this.initializedThreads.length ===
                                this.measurementTasks.length
                            ) {
                                this.initializedThreads = []
                                for (const w of this.measurementTasks) {
                                    w.postMessage(
                                        new IncomingMessageWithData("upload")
                                    )
                                }
                            }
                            break
                        case "uploadUpdated":
                            this.interimThreadResults[index] =
                                message.data! as IMeasurementThreadResult
                            this.overallResultUp = RMBTClient.getOverallResult(
                                this.interimThreadResults,
                                (threadResult) => threadResult?.up
                            )
                            break
                        case "uploadFinished":
                            this.threadResults.push(
                                message.data! as IMeasurementThreadResult
                            )
                            if (
                                this.threadResults.length ===
                                this.measurementTasks.length
                            ) {
                                this.isRunning = false
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

        Logger.I.warn(`Calculated chunk size is ${chunkSize}`)

        //but min 4KiB
        chunkSize = Math.max(this.minChunkSize, chunkSize)

        //and max MAX_CHUNKSIZE
        chunkSize = Math.min(this.maxChunkSize, chunkSize)

        Logger.I.warn(`Setting chunk size to ${chunkSize}`)

        return chunkSize
    }
}
