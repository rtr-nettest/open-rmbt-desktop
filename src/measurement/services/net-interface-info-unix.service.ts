import { NetInterfaceInfo } from "../interfaces/net-interface-info.interface"
import cp from "child_process"
import { Logger } from "./logger.service"

export class NetInterfaceInfoUnixService implements NetInterfaceInfo {
    private static instance = new NetInterfaceInfoUnixService()

    static get I() {
        return this.instance
    }

    private constructor() {}

    async getActiveInterfaces() {
        const ifaces: string = await new Promise((res, rej) => {
            cp.exec(`ifconfig -a`, (err, out) => {
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
        const activeInterfaces =
            await NetInterfaceInfoUnixService.I.getActiveInterfaces()
        if (activeInterfaces.length <= 0 || activeInterfaces.length > 1) {
            return ""
        }
        const iface: string = await new Promise((res, rej) => {
            cp.exec(`ifconfig -v ${activeInterfaces[0].key}`, (err, out) => {
                if (err) {
                    Logger.I.error(err)
                    rej(err)
                }
                res(out)
            })
        })
        const type = /type: (.+)/
            .exec(iface)?.[1]
            ?.toLowerCase()
            .replace("-", "")
        return type
    }

    private async convertToJson(info: string) {
        const lines = info.split("\n")
        const blocks = []
        for (const line of lines) {
            const key = /^[a-z0-1]+/.exec(line)?.[0]
            const value = /flags.+/.exec(line)?.[0]
            if (key && value) {
                blocks.push({ key, value })
            } else if (blocks.length > 0) {
                blocks[blocks.length - 1].value += "\n" + line
            }
        }
        return blocks.filter(
            (b) =>
                b.value.includes("status: active") &&
                b.value.includes("inet") &&
                b.value.includes("broadcast")
        )
    }
}
