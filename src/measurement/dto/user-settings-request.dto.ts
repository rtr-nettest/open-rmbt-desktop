import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import tz from "dayjs/plugin/timezone"
import { IUserSettingsRequest } from "../interfaces/user-settings-request.interface"
import { EMeasurementServerType } from "../enums/measurement-server-type.enum"
import os from "os"
import { CLIENT_UUID, Store, TERMS_ACCEPTED } from "../services/store.service"
import { I18nService } from "../services/i18n.service"
import { v4 } from "uuid"

dayjs.extend(utc)
dayjs.extend(tz)

export class UserSettingsRequest implements IUserSettingsRequest {
    language = I18nService.I.getActiveLanguage()
    name =
        process.env.FLAVOR === "ont"
            ? EMeasurementServerType.RMBTws
            : EMeasurementServerType.RMBT
    timezone = dayjs.tz.guess()
    terms_and_conditions_accepted = false
    terms_and_conditions_accepted_version?: number
    uuid = (Store.get(CLIENT_UUID) as string) ?? v4()
    operating_system = `${os.type}, ${os.release}`

    // RTR BE compatibility
    capabilities = { RMBThttp: true }
    type = "DESKTOP"

    constructor(public platform = "DESKTOP") {
        const termsAccepted = Store.get(TERMS_ACCEPTED)
        if (termsAccepted) {
            this.terms_and_conditions_accepted = true
            this.terms_and_conditions_accepted_version = 5
        }
    }
}
