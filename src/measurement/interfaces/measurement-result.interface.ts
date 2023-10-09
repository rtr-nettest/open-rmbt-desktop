import { EMeasurementFinalStatus } from "../enums/measurement-final-status"
import { ICPU } from "./cpu.interface"

export interface IMeasurementResult {
    client_language?: string
    client_uuid: string
    client_name?: string
    client_version?: string
    client_software_version?: string
    cpu?: ICPU
    model?: string
    num_threads_ul?: number
    network_type?: number
    operating_system?: string
    os_version?: string
    pings: IPing[]
    platform?: string
    plattform?: string
    speed_detail: ISpeedItem[]
    signals: string[]
    test_bytes_download: number
    test_bytes_upload: number
    test_nsec_download: number
    test_nsec_upload: number
    test_num_threads: number
    test_ping_shortest: number
    test_speed_download: number
    test_speed_upload: number
    test_status?: EMeasurementFinalStatus
    test_token: string
    test_uuid: string
    loop_uuid?: string
    time: number
    timezone: string
    type: string
    user_server_selection: number
    measurement_server?: string
    provider_name?: string
    ip_address?: string
    sent_to_server?: boolean
    test_error?: string
}

export interface IMeasurementThreadResult {
    index: number
    down: IMeasurementThreadResultList
    up: IMeasurementThreadResultList
    chunkSize?: number
    currentTime: {
        down: number
        up: number
    }
    currentTransfer: {
        down: number
        up: number
    }
    pings: IPing[]
    ping_median: number
    ping_shortest: number
    client_version?: string
}

export interface IMeasurementThreadResultList {
    bytes: number[]
    nsec: number[]
}

export interface IPing {
    time_ns: number
    value: number
    value_server: number
}

export interface ISpeedItem {
    direction: "download" | "upload"
    thread: number
    time: number
    bytes: number
}

export interface IVoipTestResult {
    voip_result_in_num_packets: number
}

export const MEASUREMENT_TABLE = "measurements"
