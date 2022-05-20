import { config } from "dotenv"
import { MeasurementRegistrationRequest } from "./dto/measurement-registration-request.dto"
import { UserSettingsRequest } from "./dto/user-settings-request.dto"
import { ControlServerService } from "./services/control-server.service"
import { RMBTClientService } from "./services/rmbt-client.service"

export async function runMeasurement() {
    config({
        path: process.env.DOTENV_CONFIG_PATH || ".env",
    })

    const controlServer = new ControlServerService()
    const settingsRequest = new UserSettingsRequest()
    try {
        const measurementServer =
            await controlServer.getMeasurementServerFromApi(settingsRequest)
        const settings = await controlServer.getUserSettings(settingsRequest)
        let measurementRegistration = await controlServer.registerMeasurement(
            new MeasurementRegistrationRequest(
                settings.uuid,
                measurementServer?.id,
                settingsRequest
            )
        )
        const rmbClient = new RMBTClientService(measurementRegistration)
        rmbClient.scheduleMeasurement()
    } catch (err) {
        console.error(err)
    }
}
