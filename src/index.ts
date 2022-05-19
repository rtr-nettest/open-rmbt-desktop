import { config } from "dotenv"
import { MeasurementRegistrationRequest } from "./dto/measurement-registration-request.dto"
import { UserSettingsRequest } from "./dto/user-settings-request.dto"
import { ControlServerService } from "./services/control-server.service"

export async function main() {
    config({
        path: process.env.DOTENV_CONFIG_PATH || ".env",
    })

    const controlServer = new ControlServerService()
    try {
        const measurementServer = await controlServer.getTestServerFromApi()
        const settingsRequest = new UserSettingsRequest()
        const settings = await controlServer.getUserSettings(settingsRequest)
        const measurementRegistration = await controlServer.registerMeasurement(
            new MeasurementRegistrationRequest(
                settings.uuid,
                measurementServer.id,
                settingsRequest
            )
        )
    } catch (err) {
        console.error(err)
    }
}

main()
