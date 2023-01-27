import { EMeasurementStatus } from "../../../../measurement/enums/measurement-status.enum"
import { IOverallResult } from "../../../../measurement/interfaces/overall-result.interface"
import { ETestStatuses } from "../enums/test-statuses.enum"
import { ITestPhaseState } from "../interfaces/test-phase-state.interface"

export class TestPhaseState implements ITestPhaseState {
    counter: number = -1
    testUuid: string = ""
    down: number = -1
    up: number = -1
    ping: number = -1
    chart?: { x: number; y: number }[] | undefined
    container?: ETestStatuses | undefined
    duration: number = 0
    progress: number = 0
    phase: EMeasurementStatus = EMeasurementStatus.NOT_STARTED

    constructor(options?: Partial<ITestPhaseState>) {
        if (options) {
            Object.assign(this, options)
        }
    }

    setChartFromOverallResults(overallResults: IOverallResult[]) {
        this.chart = overallResults.map((r) => ({
            x: (r.nsec * 100) / overallResults[overallResults.length - 1].nsec,
            y: r.speed / 1e6,
        }))
    }
}
