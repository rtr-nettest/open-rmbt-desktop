import { hrtime } from "process"
import { TransferListItem, Worker } from "worker_threads"
import { MeasurementThreadResult } from "../dto/measurement-result.dto"
import { EMeasurementStatus } from "../enums/measurement-status.enum"
import { IMeasurementRegistrationResponse } from "../interfaces/measurement-registration-response.interface"
import { IMeasurementThreadResult } from "../interfaces/measurement-result.interface"
import { Logger } from "./logger.service"
import {
    IncomingMessageWithData,
    OutgoingMessageWithData,
} from "./worker.service"

export class RMBTWorker extends Worker {
    postMessage(
        value: IncomingMessageWithData,
        transferList?: readonly TransferListItem[]
    ): void {
        super.postMessage(value, transferList)
    }
}

export class RMBTClientService {
    measurementLastUpdate?: number
    measurementStatus: EMeasurementStatus = EMeasurementStatus.WAIT
    measurementTasks: RMBTWorker[] = []
    params: IMeasurementRegistrationResponse
    threadResults: IMeasurementThreadResult[] = []
    chunks: number[] = []
    timestamps: { index: number; time: bigint }[] = []
    phaseStartTime = 0n

    constructor(params: IMeasurementRegistrationResponse) {
        this.params = params
    }

    scheduleMeasurement() {
        Logger.I.info("Scheduling measurement...")
        this.measurementLastUpdate = new Date().getTime()
        if (this.params.test_wait > 0) {
            this.measurementStatus = EMeasurementStatus.WAIT
            setTimeout(
                this.runMeasurement.bind(this),
                this.params.test_wait * 1000
            )
        } else {
            this.runMeasurement()
        }
    }

    private async runMeasurement() {
        Logger.I.info("Running measurement...")
        this.measurementStatus = EMeasurementStatus.INIT
        for (let i = 0; i < this.params.test_numthreads; i++) {
            this.measurementTasks.push(
                new Worker("./dist/measurement/services/worker.service.js", {
                    workerData: {
                        params: this.params,
                        index: i,
                        result: new MeasurementThreadResult(),
                    },
                })
            )
        }

        for (const [index, worker] of this.measurementTasks.entries()) {
            worker.postMessage(new IncomingMessageWithData("connect"))
            worker.on("message", (message: OutgoingMessageWithData) => {
                switch (message.message) {
                    case "connected":
                        Logger.I.warn(`Worker ${index} is connected`)
                        this.threadResults.push(
                            message.data! as IMeasurementThreadResult
                        )
                        if (
                            this.threadResults.length ===
                            this.measurementTasks.length
                        ) {
                            for (const w of this.measurementTasks) {
                                w.postMessage(
                                    new IncomingMessageWithData("preDownload")
                                )
                            }
                            this.threadResults = []
                        }
                        break
                    case "preDownloadFinished":
                        this.chunks.push(message.data as number)
                        Logger.I.warn(
                            `Worker ${index} finished pre-download with ${this.chunks} chunks.`
                        )
                        if (
                            this.chunks.length === this.measurementTasks.length
                        ) {
                            this.checkIfShouldUseOneThread(this.chunks)
                            this.measurementTasks[0].postMessage(
                                new IncomingMessageWithData("ping")
                            )
                            this.chunks = []
                        }
                        break
                    case "pingFinished":
                        Logger.I.info(
                            `The ping median is ${
                                ((message.data! as IMeasurementThreadResult)
                                    .ping_median || 0n) / 1000000n
                            }ms.`
                        )
                        this.phaseStartTime = hrtime.bigint()
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
                            Logger.I.info(
                                `The download is finished in ${
                                    (hrtime.bigint() - this.phaseStartTime) /
                                    BigInt(1e9)
                                }s`
                            )
                            Logger.I.info(
                                `The total download speed is ${
                                    this.getTotalSpeed() / 1000000
                                }Mbps`
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
                            this.chunks.length === this.measurementTasks.length
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
                        this.threadResults.push(
                            message.data! as IMeasurementThreadResult
                        )
                        if (
                            this.threadResults.length ===
                            this.measurementTasks.length
                        ) {
                            Logger.I.info(
                                `All threads are reconnected. Starting upload.`
                            )
                            this.threadResults = []
                            this.phaseStartTime = hrtime.bigint()
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
                            Logger.I.info(
                                `The upload is finished in ${
                                    (hrtime.bigint() - this.phaseStartTime) /
                                    BigInt(1e9)
                                }s`
                            )
                            Logger.I.info(
                                `The total upload speed is ${
                                    this.getTotalSpeed() / 1000000
                                }Mbps`
                            )
                            this.threadResults = []
                            for (const w of this.measurementTasks) {
                                w.terminate()
                            }
                        }
                        break
                }
            })
        }
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
        let maxTime = 0n

        for (const task of this.threadResults) {
            if (task.currentTime > maxTime) {
                maxTime = task.currentTime
            }
            sumTrans += task.currentTransfer
        }

        return maxTime === 0n ? 0 : (sumTrans / Number(maxTime)) * 1e9 * 8.0
    }
}
