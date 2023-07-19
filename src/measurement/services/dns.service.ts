import { EIPVersion } from "../enums/ip-version.enum"
import dns from "dns/promises"
import { Logger } from "./logger.service"
import { IP_VERSION, Store } from "./store.service"

export class DNSService {
    private static instance = new DNSService()

    static get I() {
        return this.instance
    }

    private constructor() {}

    setPrefferedIPVersion() {
        const ipv = Store.I.get(IP_VERSION) as EIPVersion
        if (!ipv || ipv === EIPVersion.v6) {
            dns.setDefaultResultOrder("verbatim")
        } else {
            dns.setDefaultResultOrder("ipv4first")
        }
    }

    async resolve(hostname: string, ipv?: EIPVersion) {
        if (!hostname) {
            return undefined
        }
        let ips: string[] = []
        if (!ipv) {
            Logger.I.info(
                "IP version is not picked. Using hostname: %s",
                hostname
            )
            return hostname
        }
        if (ipv === EIPVersion.v4) {
            ips = await dns.resolve4(hostname)
        } else if (ipv === EIPVersion.v6) {
            ips = await dns.resolve6(hostname)
        }
        if (ips.length) {
            Logger.I.info("IP version is %s. The addresses are: %o", ipv, ips)
            return ips[ips.length - 1]
        }
        throw new Error("Could not resolve the hostname")
    }
}
