import { EMeasurementServerType } from "../enums/measurement-server-type.enum"
import { IMeasurementRegistrationRequest } from "../interfaces/measurement-registration-request.interface"
import { I18nService } from "../services/i18n.service"
import { UserSettingsRequest } from "./user-settings-request.dto"
const registry = require("../../../package.json")

export class MeasurementRegistrationRequest
    implements IMeasurementRegistrationRequest
{
    client = EMeasurementServerType.RMBTel
    language = I18nService.I.getActiveLanguage()
    measurement_server_id: number | undefined
    measurement_type_flag = "regular"
    prefer_server: number | undefined
    time = new Date().getTime()
    timezone = ""
    type = ""
    user_server_selection = false
    app_version = registry.version

    constructor(
        public uuid: string,
        measurementServerId?: number,
        settingsRequest?: UserSettingsRequest
    ) {
        if (typeof measurementServerId === "number") {
            this.prefer_server = measurementServerId
            this.measurement_server_id = measurementServerId
            this.user_server_selection = true
        }
        if (settingsRequest) {
            Object.assign(this, {
                capabilities: settingsRequest.capabilities,
                language: settingsRequest.language,
                operating_system: settingsRequest.operating_system,
                platform: settingsRequest.platform,
                timezone: settingsRequest.timezone,
                type: settingsRequest.type,
            })
        }
    }
}
