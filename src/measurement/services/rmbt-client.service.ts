import { randomBytes } from "crypto"
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

export class RMBTClient {
    measurementLastUpdate?: number
    measurementStatus: EMeasurementStatus = EMeasurementStatus.WAIT
    measurementTasks: RMBTWorker[] = []
    params: IMeasurementRegistrationResponse
    initializedThreads: number[] = []
    threadResults: IMeasurementThreadResult[] = []
    chunks: number[] = []
    timestamps: { index: number; time: number }[] = []
    phaseStartTime = 0
    pingMedian = -1
    downloadMedian = -1
    uploadMedian = -1
    isRunning = false
    activityInterval?: NodeJS.Timer

    constructor(params: IMeasurementRegistrationResponse) {
        this.params = params
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
        return new Promise((finishMeasurement) => {
            Logger.I.info("Running measurement...")
            this.activityInterval = setInterval(() => {
                if (!this.isRunning) {
                    Logger.I.info("Measurement is finished")
                    for (const w of this.measurementTasks) {
                        w.terminate()
                    }
                    clearInterval(this.activityInterval)
                    finishMeasurement(null)
                }
            }, 1000)
            this.measurementStatus = EMeasurementStatus.INIT
            for (let i = 0; i < this.params.test_numthreads; i++) {
                const worker = RMBTWorkerFactory.getWorker(
                    "./dist/measurement/services/worker.service.js",
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
                            }
                            break
                        case "pingFinished":
                            this.pingMedian =
                                ((message.data! as IMeasurementThreadResult)
                                    .ping_median ?? -1000000) / 1000000
                            Logger.I.info(
                                `The ping median is ${this.pingMedian}ms.`
                            )
                            this.phaseStartTime = Time.nowNs()
                            for (const w of this.measurementTasks) {
                                w.postMessage(
                                    new IncomingMessageWithData("download")
                                )
                            }
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
                                    this.getTotalSpeed() / 1000000
                                Logger.I.info(
                                    `The download is finished in ${
                                        (Time.nowNs() - this.phaseStartTime) /
                                        1e9
                                    }s`
                                )
                                Logger.I.info(
                                    `The total download speed is ${this.downloadMedian}Mbps`
                                )
                                this.threadResults = []
                                for (const w of this.measurementTasks) {
                                    w.postMessage(
                                        new IncomingMessageWithData("preUpload")
                                    )
                                }
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
                                for (const w of this.measurementTasks) {
                                    w.postMessage(
                                        new IncomingMessageWithData(
                                            "reconnectForUpload"
                                        )
                                    )
                                }
                                this.chunks = []
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
                                this.phaseStartTime = Time.nowNs()
                                for (const w of this.measurementTasks) {
                                    w.postMessage(
                                        new IncomingMessageWithData("upload")
                                    )
                                }
                            }
                            break
                        case "uploadFinished":
                            this.threadResults.push(
                                message.data! as IMeasurementThreadResult
                            )
                            if (
                                this.threadResults.length ===
                                this.measurementTasks.length
                            ) {
                                this.uploadMedian =
                                    this.getTotalSpeed() / 1000000
                                Logger.I.info(
                                    `The upload is finished in ${
                                        (Time.nowNs() - this.phaseStartTime) /
                                        1e9
                                    }s`
                                )
                                Logger.I.info(
                                    `The total upload speed is ${this.uploadMedian}Mbps`
                                )
                                this.threadResults = []
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
    private getTotalSpeed() {
        let sumTrans = 0
        let maxTime = 0

        for (const task of this.threadResults) {
            if (task.currentTime > maxTime) {
                maxTime = task.currentTime
            }
            sumTrans += task.currentTransfer
        }

        return maxTime === 0 ? 0 : (sumTrans / Number(maxTime)) * 1e9 * 8.0
    }
}
