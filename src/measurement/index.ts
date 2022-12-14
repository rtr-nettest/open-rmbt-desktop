import { MeasurementRegistrationRequest } from "./dto/measurement-registration-request.dto"
import { MeasurementResult } from "./dto/measurement-result.dto"
import { UserSettingsRequest } from "./dto/user-settings-request.dto"
import { EMeasurementStatus } from "./enums/measurement-status.enum"
import { IBasicNetworkInfo } from "./interfaces/basic-network-info.interface"
import { IMeasurementPhaseState } from "./interfaces/measurement-phase-state.interface"
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
        const threadResults = await rmbtClient.scheduleMeasurement()
        const resultsToSubmit = new MeasurementResult(
            registrationRequest,
            rmbtClient.params!,
            threadResults,
            rmbtClient.overallResultDown!,
            rmbtClient.overallResultUp!
        )
        Logger.I.info("Results to submit: %o", resultsToSubmit)
    } catch (err) {
        Logger.I.error(err)
    }
}

export function getBasicNetworkInfo(): IBasicNetworkInfo {
    return {
        ipAddress: rmbtClient?.params.client_remote_ip ?? "-",
        serverName: rmbtClient?.params.test_server_name ?? "-",
        providerName: rmbtClient?.params.provider ?? "-",
    }
}

export function getCurrentPhaseState(): IMeasurementPhaseState {
    const phase =
        rmbtClient?.measurementStatus ?? EMeasurementStatus.NOT_STARTED
    return {
        duration: rmbtClient?.getPhaseDuration(phase) ?? -1,
        progress: rmbtClient?.getPhaseProgress(phase) ?? -1,
        ping: rmbtClient?.pingMedian ?? -1,
        down: rmbtClient?.downloadSpeedTotalMbps ?? -1,
        up: rmbtClient?.uploadSpeedTotalMbps ?? -1,
        phase,
    }
}
