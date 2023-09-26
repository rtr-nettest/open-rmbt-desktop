import { NetInterfaceInfo } from "../interfaces/net-interface-info.interface"
import cp from "child_process"
import { Logger } from "./logger.service"

export const IPv6Regex = new RegExp(
    /(?:^|(?<=\s))(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))(?=\s|$)/g
)
export const IPv4Regex = new RegExp(
    /((25[0-5]|(2[0-4]|1[0-9]|[1-9]|)[0-9])(\.)){3}((25[0-5]|(2[0-4]|1[0-9]|[1-9]|)[0-9]))/g
)

export class NetInterfaceInfoWindowsService implements NetInterfaceInfo {
    private static instance = new NetInterfaceInfoWindowsService()

    static get I() {
        return this.instance
    }

    private constructor() {}

    async getActiveInterfaces() {
        const ifaces: string = await new Promise((res, rej) => {
            cp.exec(`ipconfig`, (err, out) => {
                if (err) {
                    Logger.I.error(err)
                    rej(err)
                }
                res(out)
            })
        })
        return this.convertToJson(ifaces)
    }

    async getActiveInterfaceType() {
        const activeInterfaces = await this.getActiveInterfaces()
        if (activeInterfaces.length <= 0 || activeInterfaces.length > 1) {
            return ""
        }
        return activeInterfaces[0].key
    }

    async convertToJson(info: string) {
        const lines = info.split("\n")
        const blocks: any[] = []
        for (const line of lines) {
            let key = ""
            let lineLowered = line.toLowerCase().replace("-", "")
            switch (true) {
                case lineLowered.includes("wifi"):
                case lineLowered.includes("wlan"):
                    key = "wifi"
                    break
                case lineLowered.includes("ethernet"):
                    key = "ethernet"
                    break
                case lineLowered.includes("mobil"):
                    key = "mobile"
                    break
            }
            if (key) {
                blocks.push({ key, value: "" })
            } else if (blocks.length > 0) {
                blocks[blocks.length - 1].value += line
            }
        }
        return blocks.filter((b) => {
            const v4Matches = b.value.toLowerCase().match(IPv4Regex)
            const v6Matches = b.value.toLowerCase().match(IPv6Regex)
            return (
                (v4Matches && v4Matches.length > 1) ||
                (v6Matches && v6Matches.length > 1)
            )
        })
    }
}
