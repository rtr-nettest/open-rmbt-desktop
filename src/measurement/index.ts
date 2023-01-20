import { MeasurementRegistrationRequest } from "./dto/measurement-registration-request.dto"
import { MeasurementResult } from "./dto/measurement-result.dto"
import { UserSettingsRequest } from "./dto/user-settings-request.dto"
import { EMeasurementStatus } from "./enums/measurement-status.enum"
import { IBasicNetworkInfo } from "./interfaces/basic-network-info.interface"
import { IMeasurementPhaseState } from "./interfaces/measurement-phase-state.interface"
import { ControlServer } from "./services/control-server.service"
import { Logger } from "./services/logger.service"
import { RMBTClient } from "./services/rmbt-client.service"
import osu from "node-os-utils"

let rmbtClient: RMBTClient | undefined

export interface MeasurementOptions {
    platform?: string
}

export async function runMeasurement(options?: MeasurementOptions) {
    let cpuUsageInterval: NodeJS.Timer | undefined
    let cpuUsageList: number[] = []
    if (process.env.LOG_CPU_USAGE === "true") {
        cpuUsageInterval = setInterval(() => {
            osu.cpu.usage().then((percent) => {
                Logger.I.info(`CPU usage is ${percent}%`)
                cpuUsageList.push(percent)
            })
        }, 1000)
    }

    rmbtClient = undefined

    const controlServer = ControlServer.instance
    const settingsRequest = new UserSettingsRequest(options?.platform)
    const measurementServer = await controlServer.getMeasurementServerFromApi(
        settingsRequest
    )
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
    rmbtClient.measurementStatus = EMeasurementStatus.SUBMITTING_RESULTS
    const resultToSubmit = new MeasurementResult(
        registrationRequest,
        rmbtClient.params!,
        threadResults,
        rmbtClient.overallResultDown!,
        rmbtClient.overallResultUp!
    )
    await controlServer.submitMeasurement(resultToSubmit)
    rmbtClient.measurementStatus = EMeasurementStatus.END
    if (cpuUsageInterval) {
        clearInterval(cpuUsageInterval)
        const cpuUsageMin = Math.min(...cpuUsageList)
        const cpuUsageMax = Math.max(...cpuUsageList)
        const cpuUsageAverage =
            cpuUsageList.reduce((acc, stat) => acc + stat, 0) /
            cpuUsageList.length
        Logger.I.info(`CPU usage min is ${cpuUsageMin}%`)
        Logger.I.info(`CPU usage max is ${cpuUsageMax}%`)
        Logger.I.info(`CPU usage average is ${cpuUsageAverage}%`)
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
        testUuid: rmbtClient?.params?.test_uuid ?? "",
    }
}

export async function getMeasurementResult(testUuid: string) {
    return await ControlServer.instance.getMeasurementResult(testUuid)
}
