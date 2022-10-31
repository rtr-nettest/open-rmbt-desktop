import { config } from "dotenv"
import { MeasurementRegistrationRequest } from "./dto/measurement-registration-request.dto"
import { UserSettingsRequest } from "./dto/user-settings-request.dto"
import { ControlServer } from "./services/control-server.service"
import { Logger } from "./services/logger.service"
import { RMBTClient } from "./services/rmbt-client.service"

let rmbtClient: RMBTClient | undefined

export async function runMeasurement() {
    rmbtClient = undefined
    config({
        path: process.env.RMBT_DESKTOP_DOTENV_CONFIG_PATH || ".env",
    })

    const controlServer = new ControlServer()
    const settingsRequest = new UserSettingsRequest()
    try {
        const measurementServer =
            await controlServer.getMeasurementServerFromApi(settingsRequest)
        const settings = await controlServer.getUserSettings(settingsRequest)
        const registrationRequest = new MeasurementRegistrationRequest(
            settings.uuid,
            measurementServer?.id,
            settingsRequest
        )
        let measurementRegistration = await controlServer.registerMeasurement(
            registrationRequest
        )
        rmbtClient = new RMBTClient(measurementRegistration)
        await rmbtClient.scheduleMeasurement()
    } catch (err) {
        Logger.I.error(err)
    }
}

export function getCurrentPing() {
    return rmbtClient?.pingMedian ?? -1
}

export function getCurrentDownload() {
    return rmbtClient?.downloadMedian ?? -1
}

export function getCurrentUpload() {
    return rmbtClient?.uploadMedian ?? -1
}
