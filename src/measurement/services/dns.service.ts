import { EIPVersion } from "../enums/ip-version.enum"
import dns from "dns/promises"
import { Logger } from "./logger.service"

export class DNSService {
    private static instance = new DNSService()

    static get I() {
        return this.instance
    }

    private constructor() {}

    async resolve(hostname: string, ipv?: EIPVersion) {
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
            Logger.I.info("IP version is %s. Using address: %s", ipv, ips[0])
            return ips[0]
        }
        throw new Error("Could not resolve the hostname")
    }
}
