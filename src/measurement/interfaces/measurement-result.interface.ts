export interface IMeasurementResult {
    client_version?: string
    encryption: string
    ip_local?: string
    ip_server?: string
    jitterMeanNanos?: number
    num_threads?: number
    packetLossPercent?: number
    ping_median?: bigint
    ping_shortest?: bigint
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
    chunksize?: number
    currentTime?: bigint
    currentTransfer?: number
}

export interface IMeasurementThreadResultList {
    bytes: number[]
    nsec: bigint[]
}

export interface IPing {
    client: bigint
    server: bigint
    timeNs: bigint
}

export interface ISpeedItem {
    upload: boolean
    thread: number
    time: bigint
    bytes: number
}

export interface IVoipTestResult {
    voip_result_in_num_packets: number
}
