import { IUserSettings } from "../interfaces/user-settings-response.interface"
import { IUserSettingsRequest } from "../interfaces/user-settings-request.interface"
import os from "os"
import { Logger } from "./logger.service"
import { ELoggerMessage } from "../enums/logger-message.enum"
import { NetInterfaceInfoUnixService } from "./net-interface-info-unix.service"
import { NetInterfaceInfoWindowsService } from "./net-interface-info-windows.service"
import { IPInfo } from "../interfaces/ip-info.interface"

const axios = require("axios")

const connectionTimeout = 3000

export class NetworkInfoService {
    private static instance = new NetworkInfoService()

    static get I() {
        return this.instance
    }

    async getIpV4Info(
        settings: IUserSettings,
        request: IUserSettingsRequest
    ): Promise<IPInfo> {
        let publicV4 = ""

        Logger.I.info(
            ELoggerMessage.POST_REQUEST,
            settings.urls.url_ipv4_check,
            request
        )
        try {
            publicV4 = (
                await axios.post(settings.urls.url_ipv4_check, request, {
                    timeout: connectionTimeout,
                })
            ).data.ip
        } catch (e) {}

        let privateV4 = ""
        let anyV4 = ""
        const interfaces: any[] = []
        for (const iface of Object.values(os.networkInterfaces())) {
            if (!iface) {
                break
            }
            for (const alias of iface) {
                if (
                    alias.internal ||
                    alias.address === "127.0.0.1" ||
                    alias.address.includes("fe80")
                ) {
                    continue
                }
                interfaces.push(alias)
                if (alias.family === "IPv4") {
                    anyV4 = alias.address
                    if (alias.address === publicV4) {
                        privateV4 = alias.address
                    }
                }
            }
        }
        const IPInfo: IPInfo = {
            publicV4,
            privateV4: privateV4 || anyV4,
            publicV6: "",
            privateV6: "",
        }
        Logger.I.info("IPv4 are %o", IPInfo)
        return IPInfo
    }

    async getIpV6Info(settings: IUserSettings, request: IUserSettingsRequest) {
        let publicV6 = ""

        Logger.I.info(
            ELoggerMessage.POST_REQUEST,
            settings.urls.url_ipv6_check,
            request
        )
        try {
            publicV6 = (
                await axios.post(settings.urls.url_ipv6_check, request, {
                    timeout: connectionTimeout,
                })
            ).data.ip
        } catch (e) {}

        let privateV6 = ""
        let anyV6 = ""
        const interfaces: any[] = []
        for (const iface of Object.values(os.networkInterfaces())) {
            if (!iface) {
                break
            }
            for (const alias of iface) {
                if (
                    alias.internal ||
                    alias.address === "127.0.0.1" ||
                    alias.address.includes("fe80")
                ) {
                    continue
                }
                interfaces.push(alias)
                if (alias.family === "IPv6") {
                    anyV6 = alias.address
                    if (alias.address === publicV6) {
                        privateV6 = alias.address
                    }
                }
            }
        }
        const IPInfo: IPInfo = {
            publicV6,
            privateV6: privateV6 || anyV6,
            publicV4: "",
            privateV4: "",
        }
        Logger.I.info("IPv6 are %o", IPInfo)
        return IPInfo
    }

    async getNetworkType(): Promise<number> {
        let type: string | undefined
        try {
            if (process.platform === "win32") {
                type =
                    await NetInterfaceInfoWindowsService.I.getActiveInterfaceType()
            } else {
                type =
                    await NetInterfaceInfoUnixService.I.getActiveInterfaceType()
            }
        } catch (e) {
            Logger.I.error(e)
            return 98
        }
        switch (type) {
            case "wifi":
                return 99
            case "mobile":
                return 105
            case "ethernet":
                return 106
            default:
                return 98
        }
    }
}
