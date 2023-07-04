import { EMeasurementStatus } from "../enums/measurement-status.enum"
import { IPing } from "./measurement-result.interface"

export interface IMeasurementPhaseState {
    duration: number
    progress: number
    down: number
    up: number
    ping: number
    pings: IPing[]
    phase: EMeasurementStatus
    testUuid: string
    time: number
}
