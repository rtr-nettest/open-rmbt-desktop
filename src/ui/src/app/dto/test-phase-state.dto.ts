import { EMeasurementStatus } from "../../../../measurement/enums/measurement-status.enum"
import { IPing } from "../../../../measurement/interfaces/measurement-result.interface"
import { IOverallResult } from "../../../../measurement/interfaces/overall-result.interface"
import { ETestStatuses } from "../enums/test-statuses.enum"
import { speedLog } from "../helpers/number"
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
    label?: string | undefined
    time: number = -1
    pings: IPing[] = []

    constructor(options?: Partial<ITestPhaseState>) {
        if (options) {
            Object.assign(this, options)
        }
    }

    setChartFromOverallSpeed(overallResults: IOverallResult[]) {
        this.chart = overallResults.map((r) => ({
            x: (r.nsec * 100) / overallResults[overallResults.length - 1].nsec,
            y: r.speed / 1e6,
        }))
        // Always start at 0
        if (this.chart[0]?.x != 0) {
            this.chart.unshift({ x: 0, y: 0 })
        }
    }

    setChartFromPings(pings: IPing[]): void {
        this.chart = pings.map((p, i) => ({
            x: i,
            y: Math.round(p.value_server / 1e6),
        }))
    }

    extendRTRSpeedChart() {
        if (!(this.duration >= 0 && this.counter >= 0)) {
            return
        }
        this.chart = [
            ...(this.chart || []),
            {
                x: this.duration,
                y: speedLog(this.counter),
            },
        ]
    }

    extendONTSpeedChart() {
        this.chart = [
            ...(this.chart || []),
            {
                x: this.progress * 100,
                y: Math.max(0, this.counter),
            },
        ]
    }
}
