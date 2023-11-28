import { Point } from "chart.js"
import { EMeasurementStatus } from "../../../../measurement/enums/measurement-status.enum"
import { IPing } from "../../../../measurement/interfaces/measurement-result.interface"
import { IOverallResult } from "../../../../measurement/interfaces/overall-result.interface"
import { ETestStatuses } from "../enums/test-statuses.enum"
import { ITestPhaseState } from "../interfaces/test-phase-state.interface"
import { ConversionService } from "../services/conversion.service"
import * as dayjs from "dayjs"
import { STATE_UPDATE_TIMEOUT } from "../store/test.store"

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

    private conversion = new ConversionService()

    constructor(options?: Partial<ITestPhaseState>) {
        if (options) {
            Object.assign(this, options)
        }
    }

    setONTChartFromOverallSpeed(overallResults: IOverallResult[]) {
        this.chart = overallResults.map((r) => ({
            x: (r.nsec * 100) / overallResults[overallResults.length - 1].nsec,
            y: r.speed / 1e6,
        }))
        // Always start at 0
        if (this.chart[0]?.x != 0) {
            this.chart.unshift({ x: 0, y: 0 })
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
        }, [] as Point[])
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
        this.chart = [
            ...(this.chart || []),
            {
                x: Math.max(this.duration - STATE_UPDATE_TIMEOUT / 500, 0),
                y: this.conversion.speedLog(this.counter),
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
