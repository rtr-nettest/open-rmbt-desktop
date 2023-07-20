import axios from "axios"
import { IUserSettings } from "../interfaces/user-settings-response.interface"
import { IUserSettingsRequest } from "../interfaces/user-settings-request.interface"
import os from "os"
import { Logger } from "./logger.service"
import { ELoggerMessage } from "../enums/logger-message.enum"
import { NetInterfaceInfoUnixService } from "./net-interface-info-unix.service"
import { NetInterfaceInfoWindowsService } from "./net-interface-info-windows.service"

export class NetworkInfoService {
    private static instance = new NetworkInfoService()

    static get I() {
        return this.instance
    }

    async getIPInfo(settings: IUserSettings, request: IUserSettingsRequest) {
        let publicV4 = ""
        let publicV6 = ""
        let privateV4 = ""
        let privateV6 = ""

        Logger.I.info(
            ELoggerMessage.POST_REQUEST,
            settings.urls.url_ipv4_check,
            request
        )
        try {
            publicV4 = (await axios.post(settings.urls.url_ipv4_check, request))
                .data.ip
        } catch (e) {}

        Logger.I.info(
            ELoggerMessage.POST_REQUEST,
            settings.urls.url_ipv6_check,
            request
        )
        try {
            publicV6 = (await axios.post(settings.urls.url_ipv6_check, request))
                .data.ip
        } catch (e) {}

        const interfaces = []
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
                    privateV4 = alias.address
                } else if (alias.family === "IPv6") {
                    privateV6 = alias.address
                }
            }
        }
        const IPInfo = {
            publicV4,
            publicV6,
            privateV4,
            privateV6,
        }
        Logger.I.info("IPs are %o", IPInfo)
        return IPInfo
    }

    async getNetworkType(): Promise<number | undefined> {
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
            return 0
        }
        switch (type) {
            case "wifi":
                return 99
            case "ethernet":
                return 106
            default:
                return undefined
        }
    }
}
