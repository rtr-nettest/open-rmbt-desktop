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
import { IUserSettings } from "./interfaces/user-settings-response.interface"
import { IMeasurementServerResponse } from "./interfaces/measurement-server-response.interface"
import { config } from "dotenv"
import { IPInfoService } from "./services/ip-info.service"
import { DBService } from "./services/db.service"
import "reflect-metadata"
import { EMeasurementFinalStatus } from "./enums/measurement-final-status"
import { Store } from "./services/store.service"

config({
    path: process.env.RMBT_DESKTOP_DOTENV_CONFIG_PATH || ".env",
})

export interface MeasurementOptions {
    platform?: string
}

export class MeasurementRunner {
    private static instance = new MeasurementRunner()

    static get I() {
        return this.instance
    }

    private measurementServer?: IMeasurementServerResponse
    private registrationRequest?: MeasurementRegistrationRequest
    private rmbtClient?: RMBTClient
    private cpuInfoInterval?: NodeJS.Timer
    private cpuInfoList: number[] = []
    private cpuInfo?: ICPU
    private settingsRequest?: UserSettingsRequest
    private settings?: IUserSettings

    private constructor() {
        Logger.init()
        DBService.I.init()
    }

    async registerClient(options?: MeasurementOptions): Promise<IUserSettings> {
        try {
            this.settingsRequest = new UserSettingsRequest(options?.platform)
            this.settings = await ControlServer.I.getUserSettings(
                this.settingsRequest
            )
            const ipInfo = await IPInfoService.I.getIPInfo(
                this.settings,
                this.settingsRequest
            )
            await ControlServer.I.submitUnsentMeasurements()
            return { ...this.settings, ipInfo }
        } catch (e) {
            throw new Error("The registration couldn't be completed")
        }
    }

    async runMeasurement(options?: MeasurementOptions) {
        this.rmbtClient = undefined
        try {
            this.setCPUInfoInterval()
            if (!this.settings) {
                await this.registerClient(options)
            }
            await this.setMeasurementServer()
            await this.registerMeasurement()

            const threadResults = await this.rmbtClient!.scheduleMeasurement()
            this.setCPUUsage()
            const result = new MeasurementResult(
                this.registrationRequest!,
                this.rmbtClient!.params!,
                threadResults,
                this.rmbtClient!.finalResultDown,
                this.rmbtClient!.finalResultUp,
                this.cpuInfo,
                this.rmbtClient!.measurementStatus ===
                EMeasurementStatus.ABORTED
                    ? EMeasurementFinalStatus.ABORTED
                    : EMeasurementFinalStatus.SUCCESS
            )
            await ControlServer.I.submitMeasurement(result)
            if (
                this.rmbtClient!.measurementStatus !==
                EMeasurementStatus.ABORTED
            ) {
                this.rmbtClient!.measurementStatus = EMeasurementStatus.END
            }
        } catch (e) {
            if (e) {
                // Logger.I.error(e)
                throw e
            }
        } finally {
            this.setCPUUsage()
            if (this.cpuInfo) {
                Logger.I.info(
                    ELoggerMessage.CPU_USAGE_MIN,
                    this.rounded(this.cpuInfo.load_min * 100)
                )
                Logger.I.info(
                    ELoggerMessage.CPU_USAGE_MAX,
                    this.rounded(this.cpuInfo.load_max * 100)
                )
                Logger.I.info(
                    ELoggerMessage.CPU_USAGE_AVG,
                    this.rounded(this.cpuInfo.load_avg * 100)
                )
            }
        }
    }

    abortMeasurement() {
        this.rmbtClient?.abortMeasurement()
    }

    getCurrentPhaseState(): IMeasurementPhaseState & IBasicNetworkInfo {
        const phase =
            this.rmbtClient?.measurementStatus ?? EMeasurementStatus.NOT_STARTED
        return {
            duration: this.rmbtClient?.getPhaseDuration(phase) ?? -1,
            progress: this.rmbtClient?.getPhaseProgress(phase) ?? -1,
            time: Date.now(),
            ping: this.rmbtClient?.pingMedian ?? -1,
            pings: this.rmbtClient?.pings ?? [],
            down: this.rmbtClient?.interimDownMbps ?? -1,
            up: this.rmbtClient?.interimUpMbps ?? -1,
            phase,
            testUuid: this.rmbtClient?.params?.test_uuid ?? "",
            ipAddress: this.rmbtClient?.params.client_remote_ip ?? "-",
            serverName: this.rmbtClient?.params.test_server_name ?? "-",
            providerName: this.rmbtClient?.params.provider ?? "-",
        }
    }

    async getMeasurementResult(testUuid: string) {
        return await ControlServer.I.getMeasurementResult(testUuid)
    }

    getCPUUsage(): ICPU | undefined {
        return this.cpuInfo
    }

    private setCPUUsage() {
        if (!this.cpuInfoInterval) {
            this.cpuInfo = undefined
            return
        }
        clearInterval(this.cpuInfoInterval)
        this.cpuInfoInterval = undefined
        this.cpuInfo = {
            load_min: this.rounded(Math.min(...this.cpuInfoList) / 100),
            load_max: this.rounded(Math.max(...this.cpuInfoList) / 100),
            load_avg: this.rounded(
                this.cpuInfoList.reduce((acc, stat) => acc + stat, 0) /
                    this.cpuInfoList.length /
                    100
            ),
            model: osu.cpu.model(),
            cores: osu.cpu.count(),
            speed: os.cpus()[0].speed,
        }
    }

    private setCPUInfoInterval() {
        this.cpuInfo = undefined
        this.cpuInfoList = []
        if (process.env.LOG_CPU_USAGE === "true") {
            this.cpuInfoInterval = setInterval(() => {
                osu.cpu.usage().then((percent) => {
                    Logger.I.info(ELoggerMessage.CPU_USAGE, percent)
                    this.cpuInfoList.push(percent)
                })
            }, 1000)
        }
    }

    private async setMeasurementServer() {
        this.measurementServer =
            await ControlServer.I.getMeasurementServerFromApi(
                this.settingsRequest!
            )
    }

    private async registerMeasurement() {
        this.registrationRequest = new MeasurementRegistrationRequest(
            this.settings!.uuid,
            this.measurementServer?.id,
            this.settingsRequest
        )
        const measurementRegistration =
            await ControlServer.I.registerMeasurement(this.registrationRequest)
        this.rmbtClient = new RMBTClient(measurementRegistration)
    }

    private rounded = (num: number) => Math.round(num * 1000) / 1000
}
