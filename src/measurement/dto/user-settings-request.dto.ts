import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import tz from "dayjs/plugin/timezone"
import { IUserSettingsRequest } from "../interfaces/user-settings-request.interface"
import { EMeasurementServerType } from "../enums/measurement-server-type.enum"
import os from "os"
import {
    CLIENT_UUID,
    Store,
    TERMS_ACCEPTED_VERSION,
} from "../services/store.service"
import { I18nService } from "../services/i18n.service"
import { v4 } from "uuid"
import * as packJson from "../../../package.json"

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
    uuid = ""
    operating_system = `${os.type()}, ${os.release()}`
    softwareVersion?: string | undefined
    softwareRevision?: string | undefined

    // RTR BE compatibility
    capabilities = { RMBThttp: true }
    model?: string | undefined
    os_version?: string | undefined
    type = "DESKTOP"
    plattform?: string | undefined

    constructor(public platform = "DESKTOP") {
        const termsAccepted = Store.get(TERMS_ACCEPTED_VERSION) as number
        if (termsAccepted) {
            this.terms_and_conditions_accepted = true
            this.terms_and_conditions_accepted_version = termsAccepted
        }
        if (process.env.FLAVOR === "ont") {
            this.uuid = (Store.get(CLIENT_UUID) as string) ?? v4()
        } else {
            this.uuid = Store.get(CLIENT_UUID) as string
            const [platform, os_version] = this.operating_system.split(", ")
            this.os_version = os_version
            this.platform = platform
            this.plattform = platform
            this.model = "Desktop_" + os.machine()
            this.softwareVersion = packJson.version
            this.softwareRevision = `${packJson.gitInfo.branch}-${packJson.gitInfo.hash}`
        }
    }
}
