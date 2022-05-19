import { EMeasurementStatus } from "../enums/measurement-status.enum"
import { IMeasurementRegistrationResponse } from "../interfaces/measurement-registration-response.interface"
import { RMBTTestService } from "./rmbt-test.service"

export class RMBTClientService {
    measurementLastUpdate?: number
    measurementStatus: EMeasurementStatus = EMeasurementStatus.WAIT
    measurementTasks: RMBTTestService[] = []
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
            this.measurementTasks.push(new RMBTTestService(this.params, i))
        }

        const connectedThreads = await Promise.all(
            this.measurementTasks.map((t) => t.connect())
        )
    }

    private getTotalSpeed() {
        let sumTrans = 0
        let maxTime = 0

        for (const task of this.measurementTasks) {
            if (task.currentTime > maxTime) {
                maxTime = task.currentTime
            }
            sumTrans += task.currentTransfer
        }

        return maxTime === 0 ? 0 : (sumTrans / maxTime) * 1e9 * 8.0
    }
}
