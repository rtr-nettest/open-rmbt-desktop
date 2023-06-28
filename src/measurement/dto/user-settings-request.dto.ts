import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import tz from "dayjs/plugin/timezone"
import { IUserSettingsRequest } from "../interfaces/user-settings-request.interface"
import { EMeasurementServerType } from "../enums/measurement-server-type.enum"
import os from "os"
import { CLIENT_UUID, Store } from "../services/store.service"

dayjs.extend(utc)
dayjs.extend(tz)

export class UserSettingsRequest implements IUserSettingsRequest {
    language = "en"
    name = EMeasurementServerType.RMBT
    timezone = dayjs.tz.guess()
    terms_and_conditions_accepted = true
    uuid = ""
    operating_system = `${os.type}, ${os.release}`

    // RTR BE compatibility
    capabilities = { RMBThttp: true }
    type = "DESKTOP"

    constructor(public platform = "DESKTOP") {
        this.uuid = Store.I.get(CLIENT_UUID) as string
    }
}
