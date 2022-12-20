import { EMeasurementServerType } from "../enums/measurement-server-type.enum"

export interface IUserSettingsRequest {
    api_level?: number
    capabilities?: { [key: string]: any }
    device?: string
    language: string
    model?: string
    name: EMeasurementServerType
    os_version?: string
    platform?: string
    softwareRevision?: string
    softwareRevisionCode?: number
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
