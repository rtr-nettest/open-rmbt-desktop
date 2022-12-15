export interface IMeasurementResult {
    client_uuid: string
    client_name?: string
    client_version?: string
    model?: string
    network_type: number
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
}

export interface IMeasurementThreadResult {
    down: IMeasurementThreadResultList
    up: IMeasurementThreadResultList
    chunkSize?: number
    currentTime: number
    currentTransfer: number
    speedItems: ISpeedItem[]
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
