import { IMeasurementPhaseState } from "../../../../measurement/interfaces/measurement-phase-state.interface"
import { IOverallResult } from "../../../../measurement/interfaces/overall-result.interface"
import { ETestStatuses } from "../enums/test-statuses.enum"

export interface ITestPhaseState extends IMeasurementPhaseState {
    chart?: { x: number; y: number }[]
    counter: number
    container?: ETestStatuses
    label?: string

    setChartFromOverallResults?(overallResults: IOverallResult[]): void
}
