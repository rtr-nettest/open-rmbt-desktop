import { IMeasurementPhaseState } from "../../../../measurement/interfaces/measurement-phase-state.interface"
import { ETestStatuses } from "../enums/test-statuses.enum"

export interface ITestItemState extends IMeasurementPhaseState {
    chart?: { x: number; y: number }[]
    container?: ETestStatuses
    label?: string
}
