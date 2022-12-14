import {
    IMeasurementThreadResult,
    IMeasurementThreadResultList,
    IPing,
    ISpeedItem,
} from "../interfaces/measurement-result.interface"

export class MeasurementThreadResult implements IMeasurementThreadResult {
    down: IMeasurementThreadResultList = {
        bytes: [],
        nsec: [],
    }
    up: IMeasurementThreadResultList = {
        bytes: [],
        nsec: [],
    }
    pings: IPing[] = []
    speedItems: ISpeedItem[] = []
    currentTime = 0
    currentTransfer = 0
    ping_median = -1
    ping_shortest = -1
}
