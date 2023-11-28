import { EMeasurementFinalStatus } from "../enums/measurement-final-status"
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
    client_language?: string
    client_name?: string
    client_software_version?: string
    client_version?: string
    client_uuid: string
    cpu?: ICPU
    model: string
    ip_address?: string | undefined
    measurement_server?: string
    network_type?: number
    num_threads_ul?: number
    operating_system: string
    pings: IPing[]
    platform: string
    plattform: string
    provider_name?: string
    sent_to_server = false
    signals: string[] = []
    speed_detail: ISpeedItem[]
    test_bytes_download: number
    test_bytes_upload: number
    test_error?: string | undefined
    test_nsec_download: number
    test_nsec_upload: number
    test_num_threads: number
    test_ping_shortest: number
    test_speed_download: number
    test_speed_upload: number
    test_status?: number
    test_token: string
    test_uuid: string
    time: number
    timezone: string
    type: string
    user_server_selection: number
    os_version: string

    constructor(
        registrationRequest: IMeasurementRegistrationRequest,
        registrationResponse: IMeasurementRegistrationResponse,
        threadResults: IMeasurementThreadResult[],
        overallResultDown?: IOverallResult,
        overallResultUp?: IOverallResult,
        cpu?: ICPU,
        testStatus?: EMeasurementFinalStatus,
        testError?: string
    ) {
        this.client_language = registrationRequest.language
        this.client_name = registrationRequest.client
        this.client_version = threadResults[0]?.client_version ?? ""
        this.client_software_version = registrationRequest.app_version
        this.client_uuid = registrationRequest.uuid ?? ""
        this.model = registrationRequest.model ?? ""
        this.num_threads_ul = threadResults.reduce(
            (acc, thread) => (thread.up.bytes.length ? (acc += 1) : acc),
            0
        )
        this.os_version = registrationRequest.os_version ?? ""
        this.operating_system = registrationRequest.operating_system ?? ""
        this.pings = MeasurementResult.getPings(threadResults)
        this.test_ping_shortest = MeasurementResult.getShortestPing(this.pings)
        this.platform = registrationRequest.platform ?? ""
        this.plattform = registrationRequest.plattform ?? ""
        this.speed_detail = MeasurementResult.getSpeedDetail(threadResults)
        this.test_num_threads = registrationResponse.test_numthreads
        this.test_token = registrationResponse.test_token
        this.test_uuid = registrationResponse.test_uuid
        this.time = registrationRequest.time
        this.timezone = registrationRequest.timezone
        this.type = registrationRequest.type
        this.user_server_selection = registrationRequest.user_server_selection
            ? 1
            : 0
        this.test_bytes_download = overallResultDown?.bytes ?? 0
        this.test_nsec_download = overallResultDown?.nsec ?? 0
        this.test_speed_download = (overallResultDown?.speed ?? 0) / 1e3
        this.test_bytes_upload = overallResultUp?.bytes ?? 0
        this.test_nsec_upload = overallResultUp?.nsec ?? 0
        this.test_speed_upload = (overallResultUp?.speed ?? 0) / 1e3
        this.cpu = cpu
        this.measurement_server = registrationResponse.test_server_name
        this.provider_name = registrationResponse.provider
        this.ip_address = registrationResponse.client_remote_ip
        this.test_status = testStatus
        this.network_type = registrationRequest.networkType
        if (testError) {
            this.test_error = testError
        }
    }

    static getPings(threadResults: IMeasurementThreadResult[]) {
        if (!threadResults.length) {
            return []
        }
        return (
            threadResults
                .reduce(
                    (acc, result) =>
                        result?.pings?.length > 0 ? result.pings : acc,
                    [] as IPing[]
                )
                .sort((a, b) => a.time_ns - b.time_ns) ?? []
        )
    }

    static getShortestPing(pings: IPing[]) {
        return pings.reduce((acc, ping) => {
            return Math.min(
                acc,
                ping.value > 0 ? ping.value : acc,
                ping.value_server > 0 ? ping.value_server : acc
            )
        }, Infinity)
    }

    static getSpeedDetail(threadResults: IMeasurementThreadResult[]) {
        if (!threadResults.length) {
            return []
        }
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

    static getThreadSpeedItems(
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
