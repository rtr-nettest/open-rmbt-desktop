import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import tz from "dayjs/plugin/timezone"
import { IUserSettingsRequest } from "../interfaces/user-settings-request.interface"
import { EMeasurementServerType } from "../enums/measurement-server-type.enum"
import os from "os"
import { CLIENT_UUID, Store } from "../services/store.service"
import { I18nService } from "../services/i18n.service"

dayjs.extend(utc)
dayjs.extend(tz)

export class UserSettingsRequest implements IUserSettingsRequest {
    language = I18nService.I.getActiveLanguage()
    name = EMeasurementServerType.RMBT
    timezone = dayjs.tz.guess()
    terms_and_conditions_accepted = true
    uuid = (Store.I.get(CLIENT_UUID) as string) ?? ""
    operating_system = `${os.type}, ${os.release}`

    // RTR BE compatibility
    capabilities = { RMBThttp: true }
    type = "DESKTOP"

    constructor(public platform = "DESKTOP") {}
}
