import { EMeasurementStatus } from "../enums/measurement-status.enum"
import { MeasurementOptions } from "./measurement-options.interface"
import { IMeasurementRegistrationResponse } from "./measurement-registration-response.interface"
import { IMeasurementThreadResult, IPing } from "./measurement-result.interface"
import { IOverallResult } from "./overall-result.interface"
import { RMBTWorker } from "./rmbt-worker.interface"

export interface IRMBTClient {
    finalResultDown?: IOverallResult
    finalResultUp?: IOverallResult
    measurementLastUpdate?: number
    measurementStatus: EMeasurementStatus
    measurementTasks?: RMBTWorker[]
    params: IMeasurementRegistrationResponse
    initializedThreads: number[]
    interimThreadResults: IMeasurementThreadResult[]
    threadResults: IMeasurementThreadResult[]
    chunks: number[]
    timestamps: { index: number; time: number }[]
    pingMedian: number
    measurementStart: number
    isRunning: boolean
    activityInterval?: NodeJS.Timeout
    aborter: AbortController
    pings: IPing[]
    downs: IOverallResult[]
    ups: IOverallResult[]
    interimDownInterval?: NodeJS.Timeout
    interimUpInterval?: NodeJS.Timeout

    interimDownMbps: number
    interimUpMbps: number
    finalDownMbps: number
    finalUpMbps: number

    getTestUuid(): string
    getPhaseDuration(phase: string): number
    getPhaseProgress(phase: string): number
    scheduleMeasurement(
        options?: MeasurementOptions,
    ): Promise<IMeasurementThreadResult[]>
    abortMeasurement(): void
}
