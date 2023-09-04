import { EMeasurementServerType } from "../enums/measurement-server-type.enum"
import { IGeolocation } from "./geolocation.interface"

export interface IMeasurementRegistrationRequest {
    app_version?: string
    capabilities?: { [key: string]: any }
    client: EMeasurementServerType
    language: string
    location?: IGeolocation
    loopmode_info?: {
        client_uuid: string
        loop_uuid: string
        max_delay: number
        max_movement: number
        max_tests: number
        test_counter: number
        test_uuid: string
        text_counter: number
        uid: number
    }
    measurement_server_id?: number
    measurement_type_flag: string
    model?: string
    ndt?: boolean
    networkType?: number
    num_threads?: number
    os_version?: string
    operating_system?: string
    platform?: string
    plattform?: string
    prefer_server?: number
    previousTestStatus?: string
    protocol_version?: string
    softwareRevision?: string
    softwareVersion?: string
    softwareVersionCode?: number
    testCounter?: number
    time: number
    timezone: string
    type: string
    user_loop_mode?: boolean
    user_server_selection?: boolean
    uuid: string
    version?: number | string
}
