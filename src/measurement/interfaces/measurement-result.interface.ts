export interface IMeasurementResult {
    client_version?: string
    encryption: string
    ip_local?: string
    ip_server?: string
    jitterMeanNanos?: number
    num_threads?: number
    packetLossPercent?: number
    ping_median?: number
    ping_shortest?: number
    pings: IPing[]
    port_remote?: number
    speedItems: ISpeedItem[]
    voipTestResult?: IVoipTestResult
}

export interface IMeasurementThreadResult extends IMeasurementResult {
    down: IMeasurementThreadResultList
    up: IMeasurementThreadResultList
    totalDownBytes: number
    totalUpBytes: number
    chunkSize?: number
    currentTime: number
    currentTransfer: number
}

export interface IMeasurementThreadResultList {
    bytes: number[]
    nsec: number[]
}

export interface IPing {
    client: number
    server: number
    timeNs: number
}

export interface ISpeedItem {
    upload: boolean
    thread: number
    time: number
    bytes: number
}

export interface IVoipTestResult {
    voip_result_in_num_packets: number
}
