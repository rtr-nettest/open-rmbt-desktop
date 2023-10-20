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
    }
    uuid: string
    qostesttype_desc: [
        {
            name: string
            test_type: string
        }
    ]
    ipInfo?: IPInfo
    terms_and_conditions: ITerms
    shouldAcceptTerms?: boolean
    termsText?: string
}

export interface ITerms {
    version: number
    url: string
    ndt_url: null
}
