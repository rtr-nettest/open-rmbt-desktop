import { EMeasurementServerType } from "../enums/measurement-server-type.enum"

export interface IUserSettingsRequest {
    api_level?: number
    capabilities?: { [key: string]: any }
    language: string
    model?: string
    name: EMeasurementServerType
    os_version?: string
    platform?: string
    plattform?: string
    softwareRevision?: string
    softwareRevisionCode?: number
    softwareVersion?: string
    softwareVersionName?: string
    terms_and_conditions_accepted: boolean
    terms_and_conditions_accepted_version?: number
    timezone: string
    type: string
    user_server_selection?: boolean
    uuid: string
    version_code?: number
    version_name?: number
}
