import { NetInterfaceInfo } from "../interfaces/net-interface-info.interface"
import cp from "child_process"
import { Logger } from "./logger.service"

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
        return (await this.getActiveInterfaces())[0].key
    }

    private async convertToJson(info: string) {
        const lines = info.split("\n")
        const blocks = []
        for (const line of lines) {
            let key = ""
            let lineLowered = line.toLowerCase()
            switch (true) {
                case lineLowered.includes("wifi"):
                    key = "wifi"
                    break
                case lineLowered.includes("ethernet"):
                    key = "ethernet"
                    break
            }
            if (key) {
                blocks.push({ key, value: "" })
            } else if (blocks.length > 0) {
                blocks[blocks.length - 1].value += "\n" + line
            }
        }
        return blocks.filter(
            (b) =>
                !b.value.toLowerCase().includes("disconnected") &&
                b.value.toLowerCase().includes("address")
        )
    }
}
