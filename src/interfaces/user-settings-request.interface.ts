export interface IUserSettingsRequest {
    language: string
    timezone: string
    name: string
    terms_and_conditions_accepted: boolean
    type: string
    uuid: string
    version_code?: number
    version_name?: number
}
