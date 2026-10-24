import { IPInfo } from "./ip-info.interface"

export interface IUserSetingsResponse {
    settings: IUserSettings[]
    error: string[]
}

export interface IUserSettings {
    urls: {
        url_ipv6_check: string
        control_ipv4_only: string
        open_data_prefix: string
        url_ipv4_check: string
        control_ipv6_only: string
        statistics: string
        url_statistic_server: string
        url_web_statistic_server: string
    }
    uuid: string
    qostesttype_desc: [
        {
            name: string
            test_type: string
        },
    ]
    ipInfo?: IPInfo
    terms_and_conditions: ITerms
    shouldAcceptTerms?: boolean
    termsText?: string
    // Selectable test servers delivered by the control server (no separate
    // endpoint / .env path). `servers_ws` is the list used for the WebSocket
    // (RMBTws) client; the desktop server selection reads it directly.
    servers?: IMeasurementServerOption[]
    servers_ws?: IMeasurementServerOption[]
    servers_qos?: IMeasurementServerOption[]
    // Color-classification thresholds delivered by the control server. The web
    // client reads these from /settings instead of hardcoding them; the desktop
    // mirrors that (see ClassificationService). Optional: older servers omit it.
    classification_thresholds?: IClassificationThresholds
}

// Per-metric classification boundaries. Each metric maps a classification bucket
// number ("2".."4") to that bucket's boundary value, in the control server's
// own units: *_kbit in kbit/s, ping_ms in milliseconds, signal_* in dBm.
export interface IClassBoundaries {
    [classNumber: string]: number
}

export interface IClassificationThresholds {
    download_kbit?: IClassBoundaries
    upload_kbit?: IClassBoundaries
    ping_ms?: IClassBoundaries
    signal_mobile?: IClassBoundaries
    signal_mobile_rsrp?: IClassBoundaries
    signal_wifi?: IClassBoundaries
}

export interface IMeasurementServerOption {
    name: string
    uuid: string
}

export interface ITerms {
    version: number
    url: string
    ndt_url: null
}
