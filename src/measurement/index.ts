import { MeasurementRegistrationRequest } from "./dto/measurement-registration-request.dto"
import { UserSettingsRequest } from "./dto/user-settings-request.dto"
import { ITestPhaseState } from "./interfaces/test-phase-state.interface"
import { ControlServer } from "./services/control-server.service"
import { Logger } from "./services/logger.service"
import { RMBTClient, TestPhase } from "./services/rmbt-client.service"

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

export function getCurrentPhaseState(phase: TestPhase): ITestPhaseState {
    let value = -1
    switch (phase) {
        case "ping":
            value = rmbtClient?.pingMedian ?? -1
            break
        case "download":
            value = rmbtClient?.downloadMedian ?? -1
            break
        case "upload":
            value = rmbtClient?.uploadMedian ?? -1
            break
    }
    return {
        duration: rmbtClient?.getPhaseDuration(phase) ?? -1,
        progress: rmbtClient?.getPhaseProgress(phase) ?? -1,
        value,
    }
}
