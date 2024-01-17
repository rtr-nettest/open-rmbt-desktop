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
import { NetworkInfoService } from "./services/network-info.service"
import { DBService } from "./services/db.service"
import "reflect-metadata"
import { EMeasurementFinalStatus } from "./enums/measurement-final-status"
import { AutoUpdater } from "./services/auto-updater.service"
import { ACTIVE_SERVER, Store } from "./services/store.service"
import { ILoopModeInfo } from "./interfaces/measurement-registration-request.interface"

config({
    path: process.env.RMBT_DESKTOP_DOTENV_CONFIG_PATH || ".env",
})

export interface MeasurementOptions {
    platform?: string
    loopModeInfo?: ILoopModeInfo
}

export class MeasurementRunner {
    private static instance = new MeasurementRunner()

    static get I() {
        return this.instance
    }

    private measurementServer?: IMeasurementServerResponse
    private registrationRequest?: MeasurementRegistrationRequest
    private rmbtClient?: RMBTClient
    private cpuInfoInterval?: NodeJS.Timeout
    private cpuInfoList: number[] = []
    private cpuInfo?: ICPU
    private settingsRequest?: UserSettingsRequest
    private settings?: IUserSettings
    private startTimeMs = 0
    private endTimeMs = 0

    private constructor() {
        Logger.init()
        DBService.I.init()
    }

    async registerClient(options?: MeasurementOptions): Promise<IUserSettings> {
        try {
            AutoUpdater.I.checkForNewRelease()
            this.settingsRequest = new UserSettingsRequest(options?.platform)
            this.settings = await ControlServer.I.getUserSettings(
                this.settingsRequest
            )
            if (this.settings.shouldAcceptTerms) {
                return this.settings
            }
            await ControlServer.I.submitUnsentMeasurements()
            return this.settings
        } catch (e) {
            throw new Error("The registration couldn't be completed")
        }
    }

    async getIpV4Info(settings: IUserSettings) {
        if (!this.settingsRequest) {
            return undefined
        }
        const ipInfo = await NetworkInfoService.I.getIpV4Info(
            settings,
            this.settingsRequest
        )
        return ipInfo
    }

    async getIpV6Info(settings: IUserSettings) {
        if (!this.settingsRequest) {
            return undefined
        }
        const ipInfo = await NetworkInfoService.I.getIpV6Info(
            settings,
            this.settingsRequest
        )
        return ipInfo
    }

    async runMeasurement(options?: MeasurementOptions) {
        this.rmbtClient = undefined
        this.startTimeMs = Date.now()
        try {
            this.setCPUInfoInterval()
            if (!this.settings) {
                await this.registerClient(options)
            }
            await this.setMeasurementServer()
            await this.registerMeasurement(options)

            const threadResults = await this.rmbtClient!.scheduleMeasurement()
            this.setCPUUsage()
            this.registrationRequest = {
                ...this.registrationRequest!,
                networkType: await NetworkInfoService.I.getNetworkType(),
            }
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
            return this.rmbtClient!.measurementStatus
        } catch (e: any) {
            if (e) {
                Logger.I.error(e)
                try {
                    await ControlServer.I.submitMeasurement(
                        new MeasurementResult(
                            this.registrationRequest!,
                            this.rmbtClient!.params!,
                            [],
                            this.rmbtClient!.finalResultDown,
                            this.rmbtClient!.finalResultUp,
                            this.cpuInfo,
                            EMeasurementFinalStatus.ERROR,
                            e.message
                        )
                    )
                } finally {
                    throw e.message
                }
            }
        } finally {
            this.setCPUUsage()
            clearInterval(this.cpuInfoInterval)
            this.cpuInfoInterval = undefined
            this.endTimeMs = Date.now()
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
        if (this.rmbtClient) {
            this.rmbtClient.abortMeasurement()
            return !this.rmbtClient.isRunning
        }
        return true
    }

    getCurrentPhaseState(): IMeasurementPhaseState & IBasicNetworkInfo {
        const phase =
            this.rmbtClient?.measurementStatus ?? EMeasurementStatus.NOT_STARTED
        const down =
            this.rmbtClient?.finalDownMbps ||
            this.rmbtClient?.interimDownMbps ||
            -1
        const up =
            this.rmbtClient?.finalUpMbps || this.rmbtClient?.interimUpMbps || -1
        return {
            duration: this.rmbtClient?.getPhaseDuration(phase) ?? -1,
            progress: this.rmbtClient?.getPhaseProgress(phase) ?? -1,
            time: Date.now(),
            ping: this.rmbtClient?.pingMedian ?? -1,
            pings: this.rmbtClient?.pings ?? [],
            down,
            downs: this.rmbtClient?.downs ?? [],
            up,
            ups: this.rmbtClient?.ups ?? [],
            phase,
            testUuid: this.rmbtClient?.params?.test_uuid ?? "",
            ipAddress: this.rmbtClient?.params.client_remote_ip ?? "-",
            serverName: this.rmbtClient?.params.test_server_name ?? "-",
            providerName: this.rmbtClient?.params.provider ?? "-",
            startTimeMs: this.startTimeMs,
            endTimeMs: this.endTimeMs,
        }
    }

    getCPUUsage(): ICPU | undefined {
        return this.cpuInfo
    }

    private setCPUUsage() {
        if (!this.cpuInfoInterval) {
            this.cpuInfo = undefined
            return
        }
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
                    this.setCPUUsage()
                })
            }, 1000)
        }
    }

    private async setMeasurementServer() {
        this.measurementServer = Store.I.get(
            ACTIVE_SERVER
        ) as IMeasurementServerResponse
        if (!this.measurementServer) {
            const measurementServers =
                await ControlServer.I.getMeasurementServersFromApi(
                    this.settingsRequest!
                )
            this.measurementServer = measurementServers[0]
        }
    }

    private async registerMeasurement(options?: MeasurementOptions) {
        this.registrationRequest = new MeasurementRegistrationRequest(
            this.settings!.uuid,
            this.measurementServer?.id,
            this.settingsRequest,
            options?.loopModeInfo
        )
        if (options?.loopModeInfo) {
            Logger.I.info(
                "Registering test %d",
                options?.loopModeInfo.test_counter
            )
        }
        const measurementRegistration =
            await ControlServer.I.registerMeasurement(this.registrationRequest)
        this.rmbtClient = new RMBTClient(measurementRegistration)
    }

    private rounded = (num: number) => Math.round(num * 1000) / 1000
}
