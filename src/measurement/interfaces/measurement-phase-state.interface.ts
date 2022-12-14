import { EMeasurementStatus } from "../enums/measurement-status.enum"

export interface IMeasurementPhaseState {
    duration: number
    progress: number
    down: number
    up: number
    ping: number
    phase: EMeasurementStatus
    testUuid: string
}
