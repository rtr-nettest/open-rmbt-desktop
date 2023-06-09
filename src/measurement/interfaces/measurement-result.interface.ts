import { ICPU } from "./cpu.interface"

export interface IMeasurementResult {
    client_uuid: string
    client_name?: string
    client_version?: string
    cpu?: ICPU
    model?: string
    network_type?: number
    operating_system?: string
    pings: IPing[]
    platform?: string
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
    measurement_server?: string
    provider_name?: string
    ip_address?: string
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

export const MEASUREMENT_TABLE = "measurement"

export const MeasurementResultFields = [
    '"client_name" varchar',
    '"client_version" varchar',
    '"client_uuid" varchar NOT NULL',
    '"cpu" text',
    '"network_type" integer',
    '"operating_system" varchar',
    '"pings" text',
    '"platform" varchar',
    '"speed_detail" text',
    '"test_bytes_download" integer NOT NULL',
    '"test_bytes_upload" integer NOT NULL',
    '"test_nsec_download" integer NOT NULL',
    '"test_nsec_upload" integer NOT NULL',
    '"test_num_threads" integer NOT NULL',
    '"test_ping_shortest" integer NOT NULL',
    '"test_speed_download" integer NOT NULL',
    '"test_speed_upload" integer NOT NULL',
    '"test_token" varchar NOT NULL',
    '"test_uuid" varchar NOT NULL',
    '"time" integer NOT NULL',
    '"timezone" varchar',
    '"type" varchar',
    '"user_server_selection" integer',
    '"measurement_server" varchar',
    '"provider_name" varchar',
    '"ip_address" varchar',
]
