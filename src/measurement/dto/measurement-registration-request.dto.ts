import { EMeasurementServerType } from "../enums/measurement-server-type.enum"
import { IMeasurementRegistrationRequest } from "../interfaces/measurement-registration-request.interface"
import { UserSettingsRequest } from "./user-settings-request.dto"

export class MeasurementRegistrationRequest
    implements IMeasurementRegistrationRequest
{
    client = EMeasurementServerType.RMBT
    language = ""
    measurement_type_flag = "regular"
    prefer_server?: number | undefined
    time = new Date().getTime()
    timezone = ""
    type = ""
    user_server_selection = false

    constructor(
        public uuid: string,
        measurementServerId?: number,
        settingsRequest?: UserSettingsRequest
    ) {
        if (typeof measurementServerId === "number") {
            this.prefer_server = measurementServerId
            this.user_server_selection = true
        }
        if (settingsRequest) {
            Object.assign(this, {
                capabilities: settingsRequest.capabilities,
                client_version: settingsRequest.client_version,
                client: settingsRequest.name,
                language: settingsRequest.language,
                operating_system: settingsRequest.operating_system,
                platform: settingsRequest.platform,
                timezone: settingsRequest.timezone,
                type: settingsRequest.type,
            })
        }
    }
}
