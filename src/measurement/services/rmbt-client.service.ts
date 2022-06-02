import { MeasurementThreadResult } from "../dto/measurement-result.dto"
import { EMeasurementStatus } from "../enums/measurement-status.enum"
import { IMeasurementRegistrationResponse } from "../interfaces/measurement-registration-response.interface"
import { Logger } from "./logger.service"
import { RMBTThreadService } from "./rmbt-thread.service"

export class RMBTClientService {
    measurementLastUpdate?: number
    measurementStatus: EMeasurementStatus = EMeasurementStatus.WAIT
    measurementTasks: RMBTThreadService[] = []
    params: IMeasurementRegistrationResponse

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
        const numThreads = this.params.test_numthreads
        for (let i = 0; i < numThreads; i++) {
            this.measurementTasks.push(new RMBTThreadService(this.params, i))
        }

        // Init
        await Promise.all(
            this.measurementTasks.map((t) =>
                t.connect(new MeasurementThreadResult())
            )
        )
        await Promise.all(this.measurementTasks.map((t) => t.manageInit()))
        Logger.I.info("All threads are ready!")

        // Pre-download
        let chunkNumbers = await Promise.all(
            this.measurementTasks.map((t) => t.managePreDownload())
        )
        Logger.I.info(
            `Pre-download was finished with chunk numbers: %o`,
            chunkNumbers
        )
        this.checkIfShouldUseOneThread(chunkNumbers)

        // Ping
        const pingResults = await this.measurementTasks[0].managePing()

        Logger.I.info(
            `The ping median is ${
                (pingResults.ping_median || 0n) / 1000000n
            } ms`
        )

        // Download
        let threadResults = await Promise.all(
            this.measurementTasks.map((t) => t.manageDownload())
        )

        Logger.I.info(
            `The total download speed is ${this.getTotalSpeed() / 1000000} Mbps`
        )

        // Pre-upload
        await Promise.all(
            this.measurementTasks.map((t, i) => t.connect(threadResults[i]))
        )
        await Promise.all(this.measurementTasks.map((t) => t.manageInit()))
        Logger.I.info("All threads are ready!")
        chunkNumbers = await Promise.all(
            this.measurementTasks.map((t) => t.managePreUpload())
        )
        Logger.I.info(
            `Pre-upload was finished with chunk numbers: %o`,
            chunkNumbers
        )
        this.checkIfShouldUseOneThread(chunkNumbers)

        // Upload
        await Promise.all(
            this.measurementTasks.map((t, i) => t.connect(threadResults[i]))
        )
        await Promise.all(this.measurementTasks.map((t) => t.manageInit()))
        threadResults = await Promise.all(
            this.measurementTasks.map((t) => t.manageUpload())
        )

        Logger.I.info(
            `The total upload speed is ${this.getTotalSpeed() / 1000000} Mbps`
        )
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
                    mt.disconnect()
                    return acc
                },
                [] as RMBTThreadService[]
            )
        }
    }

    // in bytes
    private getTotalSpeed() {
        let sumTrans = 0
        let maxTime = 0n

        for (const task of this.measurementTasks) {
            if (task.currentTime > maxTime) {
                maxTime = task.currentTime
            }
            sumTrans += task.currentTransfer
        }

        return maxTime === 0n ? 0 : (sumTrans / Number(maxTime)) * 1e9 * 8.0
    }
}
