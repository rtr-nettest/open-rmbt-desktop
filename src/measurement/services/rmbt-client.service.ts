import { EMeasurementStatus } from "../enums/measurement-status.enum"
import { IMeasurementRegistrationResponse } from "../interfaces/measurement-registration-response.interface"
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
        console.log("Scheduling measurement...")
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
        console.log("Running measurement...")
        this.measurementStatus = EMeasurementStatus.INIT
        const numThreads = this.params.test_numthreads
        for (let i = 0; i < numThreads; i++) {
            this.measurementTasks.push(new RMBTThreadService(this.params, i))
        }

        await Promise.all(this.measurementTasks.map((t) => t.connect()))
        await Promise.all(this.measurementTasks.map((t) => t.manageInit()))
        console.log("All threads are ready!")
        const chunkNumbers = await Promise.all(
            this.measurementTasks.map((t) => t.managePreDownload())
        )
        this.checkIfShouldUseOneThread(chunkNumbers)
        const ping = await this.measurementTasks[0].managePing()
        await Promise.all(this.measurementTasks.map((t) => t.manageDownload()))
        console.log(`The ping median is ${ping / 1000000n} ms`)
        console.log(`The total speed is ${this.getTotalSpeed() / 1000000} Mbps`)
        await Promise.all(this.measurementTasks.map((t) => t.disconnect()))
    }

    private checkIfShouldUseOneThread(chunkNumbers: number[]) {
        console.log(
            `Predownload was finished with chunk numbers:`,
            chunkNumbers
        )
        const threadWithLowestChunkNumber = chunkNumbers.findIndex(
            (c) => c <= 4
        )
        if (threadWithLowestChunkNumber >= 0) {
            console.log("Switching to one thread.")
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
