import { MeasurementRegistrationRequest } from "./dto/measurement-registration-request.dto"
import { UserSettingsRequest } from "./dto/user-settings-request.dto"
import { ControlServer } from "./services/control-server.service"
import { Logger } from "./services/logger.service"
import { RMBTClient } from "./services/rmbt-client.service"

let rmbtClient: RMBTClient | undefined

export interface MeasurementOptions {
    platform?: string
}

export async function runMeasurement(options?: MeasurementOptions) {
    rmbtClient = undefined

    const controlServer = new ControlServer()
    const settingsRequest = new UserSettingsRequest(options?.platform)
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
