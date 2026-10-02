import { EMeasurementStatus } from "../../../../measurement/enums/measurement-status.enum"
import { IPing } from "../../../../measurement/interfaces/measurement-result.interface"
import { IOverallResult } from "../../../../measurement/interfaces/overall-result.interface"
import { ETestStatuses } from "../enums/test-statuses.enum"
import { ITestPhaseState } from "../interfaces/test-phase-state.interface"
import { ConversionService } from "../services/conversion.service"
import dayjs from "dayjs"

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
    downs: IOverallResult[] = []
    ups: IOverallResult[] = []
    startTimeMs: number = 0
    endTimeMs: number = 0
    // Elapsed phase time of the first charted speed sample, used to anchor the
    // speed chart to t=0. The native engines only report a speed a second or two
    // into each phase; without this the download/upload curve would begin partway
    // along the x-axis instead of at 0 s (the browser engine reports almost
    // immediately, so its chart already starts at 0).
    chartStartDuration?: number

    private conversion = new ConversionService()

    constructor(options?: Partial<ITestPhaseState>) {
        if (options) {
            Object.assign(this, options)
        }
    }

    setRTRChartFromOverallSpeed(overallResults: IOverallResult[]) {
        this.chart = overallResults.reduce((acc, r, i) => {
            const msec = r.nsec / 1e6
            return [
                ...acc,
                {
                    x: msec / 1e3,
                    y: this.conversion.speedLog(r.speed / 1e6),
                },
            ]
        }, [] as { x: number; y: number }[])
    }

    setChartFromPings(pings: IPing[]): void {
        const oTime = dayjs().startOf("day")
        this.chart = pings.map((p, i) => ({
            x: oTime
                .add(p.time_ns / 1e6, "milliseconds")
                .toDate()
                .getTime(),
            y: p.value_server / 1e6,
        }))
    }

    extendRTRSpeedChart() {
        if (this.counter < 0) {
            return
        }
        // Anchor the first sample to t=0 so the curve starts at the left edge of
        // the chart regardless of how long into the phase the engine took to
        // report a speed; later samples keep their real elapsed time relative to
        // that first sample.
        if (this.chartStartDuration === undefined) {
            this.chartStartDuration = this.duration
        }
        this.chart = [
            ...(this.chart || []),
            {
                x: Math.max(this.duration - this.chartStartDuration, 0),
                y: this.conversion.speedLog(this.counter),
            },
        ]
    }

}
