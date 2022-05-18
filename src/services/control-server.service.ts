import axios from "axios"
import { UserSettingsRequest } from "../dto/user-settings-request.dto"
import { ITestServerResponse } from "../interfaces/test-server-response.interface"
import { IUserSetingsResponse } from "../interfaces/user-settings-response.interface"

export class ControlServerService {
    private get headers() {
        const headers: { [key: string]: string } = {
            "Content-Type": "application/json",
        }
        if (process.env.X_NETTEST_CLIENT) {
            headers["X-Nettest-Client"] = process.env.X_NETTEST_CLIENT
        }
        return headers
    }

    async getTestServerFromApi(): Promise<ITestServerResponse> {
        console.log(`GET: ${process.env.MEASUREMENT_SERVERS_PATH}`)
        const response = await axios.get(
            `${process.env.CONTROL_SERVER_URL}${process.env.MEASUREMENT_SERVERS_PATH}`,
            { headers: this.headers }
        )
        const servers = response.data as ITestServerResponse[]
        if (servers?.length) {
            const server = servers[0]
            console.log(`Using server:`, server)
            return servers[0]
        }
        throw Error("Did not receive any measurement server")
    }

    async getUserSettings() {
        console.log(`POST: ${process.env.SETTINGS_PATH}`)
        const body = new UserSettingsRequest()
        const response = await axios.post(
            `${process.env.CONTROL_SERVER_URL}${process.env.SETTINGS_PATH}`,
            body,
            { headers: this.headers }
        )
        const settings = response.data as IUserSetingsResponse
        if (settings?.settings?.length) {
            const currentSettings = settings.settings[0]
            console.log(`Using settings:`, currentSettings)
            return currentSettings
        }
        if (settings?.error) {
            throw settings?.error
        }
        throw new Error("Did not receive any settings")
    }
}
