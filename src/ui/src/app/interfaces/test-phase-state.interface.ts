import { IMeasurementPhaseState } from "../../../../measurement/interfaces/measurement-phase-state.interface"
import { IPing } from "../../../../measurement/interfaces/measurement-result.interface"
import { IOverallResult } from "../../../../measurement/interfaces/overall-result.interface"
import { ETestStatuses } from "../enums/test-statuses.enum"

export interface ITestPhaseState extends IMeasurementPhaseState {
    chart?: { x: number; y: number }[]
    counter: number
    container?: ETestStatuses
    label?: string

    setChartFromOverallSpeed?(overallResults: IOverallResult[]): void
    setChartFromPings?(pings: IPing[]): void
    extendRTRSpeedChart(): void
    extendONTSpeedChart(): void
}
