import { MeasurementThreadResult } from "../dto/measurement-thread-result.dto"
import { EMeasurementStatus } from "../enums/measurement-status.enum"
import { IMeasurementRegistrationResponse } from "../interfaces/measurement-registration-response.interface"
import {
    IMeasurementThreadResult,
    IPing,
} from "../interfaces/measurement-result.interface"
import {
    IncomingMessageWithData,
    OutgoingMessageWithData,
    RMBTWorker,
} from "../interfaces/rmbt-worker.interface"
import { Logger } from "./logger.service"
import { RMBTWorkerFactory } from "./rmbt-worker-factory.service"
import { Time } from "./time.service"
import path from "path"
import { IOverallResult } from "../interfaces/overall-result.interface"
import { IPreDownloadResult } from "./rmbt-thread.service"
import { MeasurementResult } from "../dto/measurement-result.dto"
import { IPreUploadResult } from "./message-handlers/pre-upload-message-handler.service"
import { CalcService } from "./calc.service"

export type TransferDirection = "down" | "up"

export class RMBTClient {
    static minChunkSize = 4096
    static maxChunkSize = 4194304

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
    activityInterval?: NodeJS.Timeout
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
    private _chunkNumbers: number[] = []
    private _resolve?: Function
    private _reject?: Function
    private _error?: Error

    interimDownMbps = 0
    interimUpMbps = 0
    downs: IOverallResult[] = []
    ups: IOverallResult[] = []

    setInterimDownMbps() {
        const result = CalcService.I.getCoarseResult(
            this.interimThreadResults,
            "down"
        )
        if (this.plausibleResult(this.downs, result)) {
            this.downs.push(result)
        }
        if (this.downs.length > 0) {
            this.interimDownMbps = this.downs[this.downs.length - 1].speed / 1e6
        }
    }

    setInterimUpMbps() {
        const result = CalcService.I.getCoarseResult(
            this.interimThreadResults,
            "up"
        )
        if (this.plausibleResult(this.ups, result)) {
            this.ups.push(result)
        }
        if (this.ups.length > 0) {
            this.interimUpMbps = this.ups[this.ups.length - 1].speed / 1e6
        }
    }

    private plausibleResult(list: IOverallResult[], result: IOverallResult) {
        return (
            result.nsec >= 0 &&
            result.bytes >= 0 &&
            result.speed >= 0 &&
            (list.length === 0 ||
                (result.bytes >= list[list.length - 1].bytes &&
                    result.nsec > list[list.length - 1].nsec))
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

    async scheduleMeasurement(
        workers: RMBTWorker[]
    ): Promise<IMeasurementThreadResult[]> {
        Logger.I.info("Scheduling measurement...")
        this.measurementLastUpdate = new Date().getTime()
        if (this.params.test_wait > 0) {
            this.measurementStatus = EMeasurementStatus.WAIT
            return new Promise((resolve) => {
                setTimeout(async () => {
                    resolve(await this.runMeasurement(workers))
                }, this.params.test_wait * 1000)
            })
        } else {
            return this.runMeasurement(workers)
        }
    }

    private finishMeasurement() {
        if (!this.isRunning) {
            return
        }
        clearInterval(this.activityInterval)
        try {
            this.finalResultUp = CalcService.I.getFineResult(
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
            this.threadResults = []
            this.interimThreadResults = new Array(this.params.test_numthreads)
            if (this.measurementStatus !== EMeasurementStatus.ABORTED) {
                Logger.I.info("Measurement is finished. Submitting results.")
                this.measurementStatus = EMeasurementStatus.SUBMITTING_RESULTS
            } else {
                Logger.I.info(
                    "Measurement is aborted. Submitting the information."
                )
            }
            this.isRunning = false
            for (const w of this.measurementTasks) {
                w.postMessage(new IncomingMessageWithData("disconnect"))
                w.on("message", this.finishMessageListener)
            }
        }
    }

    abortMeasurement() {
        this.aborter.abort()
    }

    private cancelMeasurement(error?: Error) {
        if (!this.isRunning) {
            return
        }
        clearInterval(this.activityInterval)
        this._error = error
        this.threadResults = []
        this.interimThreadResults = new Array(this.params.test_numthreads)
        this.isRunning = false
        for (const w of this.measurementTasks) {
            w.postMessage(new IncomingMessageWithData("disconnect"))
            w.on("message", this.cancelMessageListener)
        }
    }

    private async runMeasurement(
        workers: RMBTWorker[]
    ): Promise<IMeasurementThreadResult[]> {
        this.isRunning = true
        this.measurementStart = Date.now()
        return new Promise((resolve, reject) => {
            this._resolve = resolve
            this._reject = reject
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
                    this.cancelMeasurement(new Error("Measurement timed out"))
                }
            }, allowedInactivityMs)
            this.measurementStatus = EMeasurementStatus.INIT
            this.interimThreadResults = new Array(this.params.test_numthreads)
            this.phaseStartTimeNs[EMeasurementStatus.INIT] = Time.nowNs()
            for (let i = 0; i < this.params.test_numthreads; i++) {
                this.measurementTasks.push(workers[i])
            }
            for (const worker of this.measurementTasks) {
                worker.on("message", this.mainMessageListener)
                worker.postMessage(
                    new IncomingMessageWithData("connect", this.params)
                )
                this.lastMessageReceivedAt = Date.now()
            }
        })
    }

    interimDownInterval?: NodeJS.Timeout
    interimUpInterval?: NodeJS.Timeout

    private finishMessageListener = (message: OutgoingMessageWithData) => {
        if (message.message === "disconnected") {
            const w = this.measurementTasks[message.threadIndex]
            w.removeListener("message", this.finishMessageListener)
            w.removeListener("message", this.cancelMessageListener)
            w.removeListener("message", this.mainMessageListener)
            this._resolve?.([
                ...this.downThreadResults,
                ...this.upThreadResults,
            ])
        }
    }

    private cancelMessageListener = (message: OutgoingMessageWithData) => {
        if (message.message === "disconnected") {
            const w = this.measurementTasks[message.threadIndex]
            w.removeListener("message", this.finishMessageListener)
            w.removeListener("message", this.cancelMessageListener)
            w.removeListener("message", this.mainMessageListener)
            if (this._error) {
                Logger.I.error(this._error)
                this.measurementStatus = EMeasurementStatus.ERROR
                const error = { ...this._error }
                this._error = undefined
                this._reject?.(error)
            } else {
                this.measurementStatus = EMeasurementStatus.ABORTED
                this._reject?.(null)
            }
        }
    }

    private mainMessageListener = (message: OutgoingMessageWithData) => {
        if (this.aborter.signal.aborted) {
            Logger.I.info("ABORTED")
            this.measurementStatus = EMeasurementStatus.ABORTED
            this.finishMeasurement()
            return
        }
        this.lastMessageReceivedAt = Date.now()
        try {
            this.parseMessage(message)
        } catch (e: any) {
            Logger.I.error("ERROR %o", e)
            this.cancelMeasurement(e)
        }
    }

    private parseMessage(message: OutgoingMessageWithData) {
        const index = message.threadIndex
        switch (message.message) {
            case "error":
                this.cancelMeasurement(message.data as Error)
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
                            new IncomingMessageWithData("preDownload")
                        )
                    }
                    this.initializedThreads = []
                    this.measurementStatus = EMeasurementStatus.INIT_DOWN
                    this.phaseStartTimeNs[EMeasurementStatus.INIT_DOWN] =
                        Time.nowNs()
                    Logger.I.warn(
                        "Init is finished in %d s",
                        this.getPhaseDuration(EMeasurementStatus.INIT)
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
                if (this.chunks.length === this.measurementTasks.length) {
                    this.measurementTasks[0].postMessage(
                        new IncomingMessageWithData("ping")
                    )
                    this.chunks = []
                    this.measurementStatus = EMeasurementStatus.PING
                    this.phaseStartTimeNs[EMeasurementStatus.PING] =
                        Time.nowNs()
                    Logger.I.warn(
                        "Pre-download is finished in %d s",
                        this.getPhaseDuration(EMeasurementStatus.INIT_DOWN)
                    )
                }
                break
            case "pingFinished":
                this.pingMedian =
                    ((message.data! as IMeasurementThreadResult).ping_median ??
                        -1000000) / 1000000
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
                    this.interimDownInterval = setInterval(() => {
                        this.setInterimDownMbps()
                    }, 200)
                }
                this.measurementStatus = EMeasurementStatus.DOWN
                this.phaseStartTimeNs[EMeasurementStatus.DOWN] = Time.nowNs()
                Logger.I.info("The ping median is %dms.", this.pingMedian)
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
                    this.threadResults.length === this.measurementTasks.length
                ) {
                    clearInterval(this.interimDownInterval)
                    this.finalResultDown = CalcService.I.getFineResult(
                        this.threadResults,
                        "down"
                    )
                    this.downThreadResults = [...this.threadResults]
                    this.threadResults = []
                    this.interimThreadResults = new Array(
                        this.params.test_numthreads
                    )
                    for (const w of this.measurementTasks) {
                        w.postMessage(new IncomingMessageWithData("preUpload"))
                    }
                    this.measurementStatus = EMeasurementStatus.INIT_UP
                    this.phaseStartTimeNs[EMeasurementStatus.INIT_UP] =
                        Time.nowNs()
                    Logger.I.info(
                        "Download is finished in %ds",
                        this.getPhaseDuration(EMeasurementStatus.DOWN)
                    )
                    Logger.I.info(
                        "The total download speed is %dMbps",
                        this.finalDownMbps
                    )
                }
                break
            case "preUploadFinished":
                const { chunkSize: cs, chunksCount } =
                    message.data as IPreUploadResult
                this.chunks.push(cs)
                this._chunkNumbers.push(chunksCount)
                Logger.I.warn(
                    "Worker %d finished pre-upload with %o chunk sizes.",
                    index,
                    this.chunks
                )
                if (this.chunks.length === this.measurementTasks.length) {
                    this.checkIfShouldUseOneThread(this._chunkNumbers)
                    for (const w of this.measurementTasks) {
                        w.postMessage(
                            new IncomingMessageWithData("reconnectForUpload")
                        )
                    }
                    this.chunks = []
                    this.measurementStatus = EMeasurementStatus.UP
                    this.phaseStartTimeNs[EMeasurementStatus.UP] = Time.nowNs()
                    Logger.I.info(
                        "Pre-upload is finished in %ds",
                        this.getPhaseDuration(EMeasurementStatus.INIT_UP)
                    )
                }
                break
            case "reconnectedForUpload":
                const isReconnected = message.data as boolean
                if (isReconnected) {
                    Logger.I.warn("Worker %d is ready for upload.", index)
                    this.initializedThreads.push(index)
                } else {
                    Logger.I.warn(
                        "Worker %d errored out. Reattempting connection.",
                        index
                    )
                    setImmediate(() => {
                        this.measurementTasks[index].postMessage(
                            new IncomingMessageWithData("reconnectForUpload")
                        )
                    })
                }
                if (
                    this.initializedThreads.length ===
                    this.measurementTasks.length
                ) {
                    const calculatedUpChunkSize = this.getChunkSize()
                    this.initializedThreads = []
                    for (const w of this.measurementTasks) {
                        w.postMessage(
                            new IncomingMessageWithData(
                                "upload",
                                calculatedUpChunkSize
                            )
                        )
                        this.interimUpInterval = setInterval(() => {
                            this.setInterimUpMbps()
                        }, 200)
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
                    this.threadResults.length === this.measurementTasks.length
                ) {
                    this.finishMeasurement()
                    clearInterval(this.interimUpInterval)
                }
                break
        }
    }

    private checkIfShouldUseOneThread(chunkNumbers: number[]) {
        Logger.I.info(
            "Checking if should use one thread. Chunk numbers are %o",
            chunkNumbers
        )
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
                    mt.postMessage(new IncomingMessageWithData("disconnect"))
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
