import { EMeasurementStatus } from "../enums/measurement-status.enum"

export interface ITestPhaseState {
    duration: number
    progress: number
    value: number
    phase: EMeasurementStatus
}
