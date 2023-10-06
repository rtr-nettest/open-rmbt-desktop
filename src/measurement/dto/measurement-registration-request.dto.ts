import { EMeasurementServerType } from "../enums/measurement-server-type.enum"
import {
    ILoopModeInfo,
    IMeasurementRegistrationRequest,
} from "../interfaces/measurement-registration-request.interface"
import { I18nService } from "../services/i18n.service"
import { UserSettingsRequest } from "./user-settings-request.dto"
const registry = require("../../../package.json")

export class MeasurementRegistrationRequest
    implements IMeasurementRegistrationRequest
{
    client = EMeasurementServerType.RMBTel
    language = ""
    measurement_server_id: number | undefined
    measurement_type_flag = "regular"
    prefer_server: number | undefined
    time = new Date().getTime()
    timezone = ""
    type = ""
    user_server_selection = false
    app_version = registry.version
    networkType?: number | undefined
    user_loop_mode?: boolean
    loopmode_info?: ILoopModeInfo | undefined

    constructor(
        public uuid: string,
        measurementServerId?: number,
        settingsRequest?: UserSettingsRequest,
        loopModeInfo?: ILoopModeInfo
    ) {
        if (typeof measurementServerId === "number") {
            this.prefer_server = measurementServerId
            this.measurement_server_id = measurementServerId
            this.user_server_selection = true
        }
        if (settingsRequest) {
            Object.assign(this, {
                capabilities: settingsRequest.capabilities,
                model: settingsRequest.model,
                language: settingsRequest.language,
                operating_system: settingsRequest.operating_system,
                os_version: settingsRequest.os_version,
                platform: settingsRequest.platform,
                plattform: settingsRequest.plattform,
                timezone: settingsRequest.timezone,
                type: settingsRequest.type,
            })
        }
        if (loopModeInfo) {
            this.user_loop_mode = true
            this.loopmode_info = loopModeInfo
        }
        this.language = I18nService.I.getActiveLanguage()
    }
}
