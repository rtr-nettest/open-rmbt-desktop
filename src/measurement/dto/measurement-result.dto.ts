import { IMeasurementRegistrationRequest } from "../interfaces/measurement-registration-request.interface"
import { IMeasurementRegistrationResponse } from "../interfaces/measurement-registration-response.interface"
import {
    IMeasurementResult,
    IMeasurementThreadResult,
    IPing,
    ISpeedItem,
} from "../interfaces/measurement-result.interface"
import { IOverallResult } from "../interfaces/overall-result.interface"

export class MeasurementResult implements IMeasurementResult {
    client_name?: string
    client_version?: string
    client_uuid: string
    network_type = 0 // TODO: detect the real one, 0 == Unknown
    operating_system: string
    pings: IPing[]
    platform: string
    speed_detail: ISpeedItem[]
    test_bytes_download: number
    test_bytes_upload: number
    test_nsec_download: number
    test_nsec_upload: number
    test_num_threads: number
    test_ping_shortest: number
    test_speed_download: number
    test_speed_upload: number
    test_token: string
    test_uuid: string
    time: number
    timezone: string
    type: string
    user_server_selection: number

    constructor(
        registrationRequest: IMeasurementRegistrationRequest,
        registrationResponse: IMeasurementRegistrationResponse,
        threadResults: IMeasurementThreadResult[],
        overallResultDown: IOverallResult,
        overallResultUp: IOverallResult
    ) {
        this.client_name = registrationRequest.client
        this.client_version = threadResults[0].client_version ?? ""
        this.client_uuid = registrationRequest.uuid ?? ""
        this.operating_system = registrationRequest.operating_system ?? ""
        this.pings = this.getPings(threadResults)
        this.test_ping_shortest = this.getShortestPing(this.pings)
        this.platform = registrationRequest.platform ?? ""
        this.speed_detail = this.getSpeedDetail(threadResults)
        this.test_num_threads = registrationResponse.test_numthreads
        this.test_token = registrationResponse.test_token
        this.test_uuid = registrationResponse.test_uuid
        this.time = registrationRequest.time
        this.timezone = registrationRequest.timezone
        this.type = registrationRequest.type
        this.user_server_selection = registrationRequest.user_server_selection
            ? 1
            : 0
        this.test_bytes_download = overallResultDown.bytes
        this.test_nsec_download = overallResultDown.nsec
        this.test_speed_download = overallResultDown.speed / 1e3
        this.test_bytes_upload = overallResultUp.bytes
        this.test_nsec_upload = overallResultUp.nsec
        this.test_speed_upload = overallResultUp.speed / 1e3
    }

    private getPings(threadResults: IMeasurementThreadResult[]) {
        return (
            threadResults
                ?.reduce(
                    (acc, result) =>
                        result?.pings?.length > 0 ? result.pings : acc,
                    [] as IPing[]
                )
                .sort((a, b) => a.time_ns - b.time_ns) ?? []
        )
    }

    private getShortestPing(pings: IPing[]) {
        return pings.reduce((acc, ping) => {
            return Math.min(
                acc,
                ping.value > 0 ? ping.value : acc,
                ping.value_server > 0 ? ping.value_server : acc
            )
        }, Infinity)
    }

    private getSpeedDetail(threadResults: IMeasurementThreadResult[]) {
        const speedItemsDownMap: { [key: number]: ISpeedItem } = {}
        const speedItemsUpMap: { [key: number]: ISpeedItem } = {}
        for (const threadResult of threadResults) {
            for (const speedItem of threadResult.speedItems) {
                if (speedItem.direction === "download") {
                    this.dedupeTime(speedItemsDownMap, speedItem)
                } else {
                    this.dedupeTime(speedItemsUpMap, speedItem)
                }
            }
        }
        const speedItemsDown = Object.values(speedItemsDownMap)
        const speedItemsUp = Object.values(speedItemsUpMap)
        speedItemsDown.sort((a, b) => a.thread - b.thread)
        speedItemsUp.sort((a, b) => a.thread - b.thread)
        return [...speedItemsDown, ...speedItemsUp]
    }

    private dedupeTime(
        map: { [key: number]: ISpeedItem },
        speedItem: ISpeedItem
    ) {
        if (!speedItem.time) {
            return map
        }
        if (!map[speedItem.time]) {
            map[speedItem.time] = speedItem
        }
        if (speedItem.bytes > map[speedItem.time].bytes) {
            map[speedItem.time] = speedItem
        }
        return map
    }
}
