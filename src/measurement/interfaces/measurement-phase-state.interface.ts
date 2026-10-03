import { EMeasurementStatus } from "../enums/measurement-status.enum"
import { IPing } from "./measurement-result.interface"
import { IOverallResult } from "./overall-result.interface"

export interface IMeasurementPhaseState {
    duration: number
    progress: number
    down: number | null
    up: number | null
    ping: number | null
    pings: IPing[]
    downs: IOverallResult[]
    ups: IOverallResult[]
    phase: EMeasurementStatus
    testUuid: string
    // Server loop UUID (bare, without the "L" prefix) once the control server has
    // minted it on the first loop iteration; "" for a single test or before it is
    // known. Surfaced here so the renderer can learn it via the normal state poll.
    loopUuid?: string
    time: number
    startTimeMs: number
    endTimeMs: number
}
