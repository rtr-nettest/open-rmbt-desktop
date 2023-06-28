import { EIPVersion } from "../enums/ip-version.enum"
import { EMeasurementServerType } from "../enums/measurement-server-type.enum"

export interface IMeasurementRegistrationResponse {
    client_remote_ip: string
    provider?: string
    test_server_encryption: boolean
    test_numthreads: number
    test_numpings?: number
    test_server_name?: string
    test_uuid: string
    test_token: string
    test_server_address: string
    test_duration: number | string
    result_url: string
    test_wait: number
    test_server_port: number
    loop_uuid?: string
    uuid?: string
    test_server_type?: EMeasurementServerType
    error?: string[]
    ip_version?: EIPVersion
}
