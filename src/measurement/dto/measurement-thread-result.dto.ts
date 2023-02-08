import {
    IMeasurementThreadResult,
    IMeasurementThreadResultList,
    IPing,
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
    currentTime = {
        down: 0,
        up: 0,
    }
    currentTransfer = {
        down: 0,
        up: 0,
    }
    ping_median = -1
    ping_shortest = -1

    constructor(public index: number) {}
}
