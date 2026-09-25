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
