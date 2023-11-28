import { EMeasurementStatus } from "../enums/measurement-status.enum"
import { IPing } from "./measurement-result.interface"
import { IOverallResult } from "./overall-result.interface"

export interface IMeasurementPhaseState {
    duration: number
    progress: number
    down: number
    up: number
    ping: number
    pings: IPing[]
    downs: IOverallResult[]
    ups: IOverallResult[]
    phase: EMeasurementStatus
    testUuid: string
    time: number
    startTimeMs: number
    endTimeMs: number
}
