import { MeasurementThreadResult } from "../dto/measurement-result.dto"
import { EMeasurementStatus } from "../enums/measurement-status.enum"
import { IMeasurementRegistrationResponse } from "../interfaces/measurement-registration-response.interface"
import { IMeasurementThreadResult } from "../interfaces/measurement-result.interface"
import {
    IncomingMessageWithData,
    RMBTWorker,
} from "../interfaces/rmbt-worker.interface"
import { Logger } from "./logger.service"
import { RMBTWorkerFactory } from "./rmbt-worker-factory.service"
import { Time } from "./time.service"
import path from "path"

export class RMBTClient {
    measurementLastUpdate?: number
    measurementStatus: EMeasurementStatus = EMeasurementStatus.WAIT
    measurementTasks: RMBTWorker[] = []
    params: IMeasurementRegistrationResponse
    initializedThreads: number[] = []
    interimThreadResults: IMeasurementThreadResult[] = []
    threadResults: IMeasurementThreadResult[] = []
    chunks: number[] = []
    timestamps: { index: number; time: number }[] = []
    pingMedian = -1
    downloadMedian = -1
    uploadMedian = -1
    measurementStart: number = 0
    isRunning = false
    activityInterval?: NodeJS.Timer
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

    async scheduleMeasurement() {
        Logger.I.info("Scheduling measurement...")
        this.measurementLastUpdate = new Date().getTime()
        if (this.params.test_wait > 0) {
            this.measurementStatus = EMeasurementStatus.WAIT
            return new Promise((resolve) => {
                setTimeout(async () => {
                    await this.runMeasurement()
                    resolve(null)
                }, this.params.test_wait * 1000)
            })
        } else {
            return this.runMeasurement()
        }
    }

    private async runMeasurement() {
        this.isRunning = true
        this.measurementStart = Date.now()
        return new Promise((finishMeasurement) => {
            Logger.I.info("Running measurement...")
            this.activityInterval = setInterval(() => {
                if (
                    !this.isRunning ||
                    Date.now() - this.measurementStart >= 60000
                ) {
                    this.uploadMedian =
                        this.getTotalSpeed(this.threadResults) / 1000000
                    this.threadResults = []
                    this.interimThreadResults = new Array(
                        this.params.test_numthreads
                    )
                    for (const w of this.measurementTasks) {
                        w.terminate()
                    }
                    clearInterval(this.activityInterval)
                    finishMeasurement(null)
                    this.measurementStatus = EMeasurementStatus.END
                    this.phaseStartTimeNs[EMeasurementStatus.END] = Time.nowNs()
                    Logger.I.info(
                        `Upload is finished in ${this.getPhaseDuration(
                            EMeasurementStatus.UP
                        )}s`
                    )
                    Logger.I.info(
                        `The total upload speed is ${this.uploadMedian}Mbps`
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
                            this.chunks.push(message.data as number)
                            Logger.I.warn(
                                `Worker ${index} finished pre-download with ${this.chunks} chunk sizes.`
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
                            for (const w of this.measurementTasks) {
                                w.postMessage(
                                    new IncomingMessageWithData("download")
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
                            this.downloadMedian =
                                this.getTotalSpeed(this.interimThreadResults) /
                                1000000
                            break
                        case "downloadFinished":
                            this.threadResults.push(
                                message.data! as IMeasurementThreadResult
                            )
                            if (
                                this.threadResults.length ===
                                this.measurementTasks.length
                            ) {
                                this.downloadMedian =
                                    this.getTotalSpeed(this.threadResults) /
                                    1000000
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
                                    `The total download speed is ${this.downloadMedian}Mbps`
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
                            this.uploadMedian =
                                this.getTotalSpeed(this.interimThreadResults) /
                                1000000
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

    // in bits per nano
    private getTotalSpeed(threadResults: IMeasurementThreadResult[]) {
        let sumTrans = 0
        let maxTime = 0

        for (const task of threadResults) {
            if (!task) {
                continue
            }
            if (task.currentTime > maxTime) {
                maxTime = task.currentTime
            }
            sumTrans += task.currentTransfer
        }

        const totalSpeed = (sumTrans / Number(maxTime)) * 1e9 * 8.0
        return maxTime === 0 ? 0 : isNaN(totalSpeed) ? 0 : totalSpeed
    }
}
