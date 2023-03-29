import { EMeasurementServerType } from "../enums/measurement-server-type.enum"
import { ICPU } from "../interfaces/cpu.interface"
import { IMeasurementRegistrationRequest } from "../interfaces/measurement-registration-request.interface"
import { IMeasurementRegistrationResponse } from "../interfaces/measurement-registration-response.interface"
import {
    IMeasurementResult,
    IMeasurementThreadResult,
    IPing,
    ISpeedItem,
} from "../interfaces/measurement-result.interface"
import { IOverallResult } from "../interfaces/overall-result.interface"
import { TransferDirection } from "../services/rmbt-client.service"

export class MeasurementResult implements IMeasurementResult {
    client_name?: string
    client_version?: string
    client_uuid: string
    cpu?: ICPU
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

    get isRTR() {
        return (
            process.env.FLAVOR === "rtr" ||
            process.env.HISTORY_RESULT_PATH_METHOD === "POST"
        )
    }

    constructor(
        registrationRequest: IMeasurementRegistrationRequest,
        registrationResponse: IMeasurementRegistrationResponse,
        threadResults: IMeasurementThreadResult[],
        overallResultDown: IOverallResult,
        overallResultUp: IOverallResult,
        cpu?: ICPU
    ) {
        this.client_name = this.isRTR
            ? EMeasurementServerType.RMBTel
            : registrationRequest.client
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
        this.cpu = cpu
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
            this.getThreadSpeedItems(speedItemsDownMap, threadResult, "down")
            this.getThreadSpeedItems(speedItemsUpMap, threadResult, "up")
        }
        const speedItemsDown = Object.values(speedItemsDownMap)
        const speedItemsUp = Object.values(speedItemsUpMap)
        speedItemsDown.sort((a, b) => a.thread - b.thread)
        speedItemsUp.sort((a, b) => a.thread - b.thread)
        return [...speedItemsDown, ...speedItemsUp]
    }

    private getThreadSpeedItems(
        map: { [key: number]: ISpeedItem },
        threadResult: IMeasurementThreadResult,
        direction: TransferDirection
    ) {
        if (!threadResult[direction]) {
            return map
        }
        for (let i = 0; i < threadResult[direction].nsec.length; i++) {
            const thisNsec = Number(threadResult[direction].nsec[i])
            const thisBytes = Number(threadResult[direction].bytes[i])
            if (isNaN(thisNsec) || isNaN(thisBytes)) {
                continue
            }
            const speedItem: ISpeedItem = {
                direction: direction === "down" ? "download" : "upload",
                thread: threadResult.index,
                time: thisNsec,
                bytes: thisBytes,
            }
            if (!map[thisNsec]) {
                map[thisNsec] = speedItem
            }
            if (speedItem.bytes > map[thisNsec].bytes) {
                map[thisNsec] = speedItem
            }
        }
        return map
    }
}
