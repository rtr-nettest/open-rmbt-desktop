import { ILoopModeInfo } from "./measurement-registration-request.interface"

export interface MeasurementOptions {
    uuid?: string
    termsAccepted?: number
    platform?: string
    loopModeInfo?: ILoopModeInfo
}
