import {
    IMeasurementResult,
    IMeasurementThreadResult,
    IMeasurementThreadResultList,
    IPing,
    ISpeedItem,
} from "../interfaces/measurement-result.interface"

export class MeasurementResult implements IMeasurementResult {
    encryption = "NONE"
    pings = []
    speedItems = []
}

export class MeasurementThreadResult implements IMeasurementThreadResult {
    down: IMeasurementThreadResultList = {
        bytes: [],
        nsec: [],
    }
    up: IMeasurementThreadResultList = {
        bytes: [],
        nsec: [],
    }
    totalDownBytes: number = 0
    totalUpBytes: number = 0
    encryption: string = "NONE"
    pings: IPing[] = []
    speedItems: ISpeedItem[] = []
    currentTime = 0
    currentTransfer = 0
}
