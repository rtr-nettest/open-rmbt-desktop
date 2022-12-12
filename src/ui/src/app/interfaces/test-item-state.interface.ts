import { ITestPhaseState } from "../../../../measurement/interfaces/test-phase-state.interface"
import { ETestStatuses } from "../enums/test-statuses.enum"

export interface ITestItemState extends ITestPhaseState {
    chart?: { x: number; y: number }[]
    container?: ETestStatuses
    label?: string
}
