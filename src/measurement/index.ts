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
import os from "os"
import { ICPU } from "./interfaces/cpu.interface"
import { ELoggerMessage } from "./enums/logger-message.enum"

let rmbtClient: RMBTClient | undefined
let cpuInfo: ICPU | undefined

const rounded = (num: number) => Math.round(num * 1000) / 1000

export interface MeasurementOptions {
    platform?: string
}

export async function runMeasurement(options?: MeasurementOptions) {
    Logger.init()
    let cpuInfoInterval: NodeJS.Timer | undefined
    let cpuInfoList: number[] = []
    rmbtClient = undefined

    try {
        if (process.env.LOG_CPU_USAGE === "true") {
            cpuInfoInterval = setInterval(() => {
                osu.cpu.usage().then((percent) => {
                    Logger.I.info(ELoggerMessage.CPU_USAGE, percent)
                    cpuInfoList.push(percent)
                })
            }, 1000)
        }

        const controlServer = ControlServer.instance
        const settingsRequest = new UserSettingsRequest(options?.platform)
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
        rmbtClient.measurementStatus = EMeasurementStatus.SUBMITTING_RESULTS
        setCPUInfo(cpuInfoList, cpuInfoInterval)
        const resultToSubmit = new MeasurementResult(
            registrationRequest,
            rmbtClient.params!,
            threadResults,
            rmbtClient.finalResultDown!,
            rmbtClient.finalResultUp!,
            cpuInfo
        )
        await controlServer.submitMeasurement(resultToSubmit)
    } catch (e) {
        throw e
    } finally {
        setCPUInfo(cpuInfoList, cpuInfoInterval)
        if (cpuInfo) {
            Logger.I.info(
                ELoggerMessage.CPU_USAGE_MIN,
                rounded(cpuInfo.load_min * 100)
            )
            Logger.I.info(
                ELoggerMessage.CPU_USAGE_MAX,
                rounded(cpuInfo.load_max * 100)
            )
            Logger.I.info(
                ELoggerMessage.CPU_USAGE_AVG,
                rounded(cpuInfo.load_avg * 100)
            )
            cpuInfo = undefined
        }
        if (rmbtClient) {
            rmbtClient.measurementStatus = EMeasurementStatus.END
        }
    }
}

function setCPUInfo(cpuInfoList: number[], cpuInfoInterval?: NodeJS.Timer) {
    if (!cpuInfoInterval) {
        cpuInfo = undefined
        return
    }
    clearInterval(cpuInfoInterval)
    cpuInfo = {
        load_min: rounded(Math.min(...cpuInfoList) / 100),
        load_max: rounded(Math.max(...cpuInfoList) / 100),
        load_avg: rounded(
            cpuInfoList.reduce((acc, stat) => acc + stat, 0) /
                cpuInfoList.length /
                100
        ),
        model: osu.cpu.model(),
        cores: osu.cpu.count(),
        speed: os.cpus()[0].speed,
    }
}

export function getCPUUsage(): ICPU | undefined {
    return cpuInfo
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
        down: rmbtClient?.interimDownMbps ?? -1,
        up: rmbtClient?.interimUpMbps ?? -1,
        phase,
        testUuid: rmbtClient?.params?.test_uuid ?? "",
    }
}

export async function getMeasurementResult(testUuid: string) {
    return await ControlServer.instance.getMeasurementResult(testUuid)
}
