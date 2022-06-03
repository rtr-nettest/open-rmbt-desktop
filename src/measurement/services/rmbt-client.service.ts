import { Worker } from "worker_threads"
import { MeasurementThreadResult } from "../dto/measurement-result.dto"
import { EMeasurementStatus } from "../enums/measurement-status.enum"
import { IMeasurementRegistrationResponse } from "../interfaces/measurement-registration-response.interface"
import { Logger } from "./logger.service"
import { RMBTThreadService } from "./rmbt-thread.service"

export class RMBTClientService {
    measurementLastUpdate?: number
    measurementStatus: EMeasurementStatus = EMeasurementStatus.WAIT
    measurementTasks: Worker[] = []
    params: IMeasurementRegistrationResponse
    threadResults: MeasurementThreadResult[] = []

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
                new Worker("./worker.js", {
                    workerData: {
                        path: "./src/measurement/services/worker.service.ts",
                        params: this.params,
                        index: i,
                        result: new MeasurementThreadResult(),
                    },
                })
            )
        }

        for (const [index, worker] of this.measurementTasks.entries()) {
            worker.postMessage("connect")
            worker.on("message", (message) => {
                switch (message.message) {
                    case "connected":
                        Logger.I.debug(`Worker ${index} is connected`)
                        this.threadResults.push(new MeasurementThreadResult())
                        if (
                            this.threadResults.length ===
                            this.measurementTasks.length
                        ) {
                            for (const w of this.measurementTasks) {
                                w.postMessage("upload")
                            }
                            this.threadResults = []
                        }
                        break
                    case "uploadFinished":
                        this.threadResults.push(message.result)
                        if (
                            this.threadResults.length ===
                            this.measurementTasks.length
                        ) {
                            Logger.I.info(
                                `The total upload speed is ${
                                    this.getTotalSpeed() / 1000000
                                }Mbps`
                            )
                            this.threadResults = []
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
            // this.measurementTasks = this.measurementTasks.reduce(
            //     (acc, mt, index) => {
            //         if (index === 0) {
            //             return [mt]
            //         }
            //         mt.disconnect()
            //         return acc
            //     },
            //     [] as RMBTThreadService[]
            // )
        }
    }

    // in bytes
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
