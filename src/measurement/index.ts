import { config } from "dotenv"
import { MeasurementRegistrationRequest } from "./dto/measurement-registration-request.dto"
import { UserSettingsRequest } from "./dto/user-settings-request.dto"
import { ControlServer } from "./services/control-server.service"
import { Logger } from "./services/logger.service"
import { RMBTClient } from "./services/rmbt-client.service"

export async function runMeasurement() {
    config({
        path: process.env.RMBT_DESKTOP_DOTENV_CONFIG_PATH || ".env",
    })

    const controlServer = new ControlServer()
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
        const rmbClient = new RMBTClient(measurementRegistration)
        rmbClient.scheduleMeasurement()
    } catch (err) {
        Logger.I.error(err)
    }
}
