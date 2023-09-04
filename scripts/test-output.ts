import { NetInterfaceInfoWindowsService } from "../src/measurement/services/net-interface-info-windows.service"
import fs from "fs"

async function main() {
    const json = await NetInterfaceInfoWindowsService.I.convertToJson(
        `
Windows-IP-Konfiguration


Ethernet-Adapter Ethernet:

   Medienstatus. . . . . . . . . . . : Medium getrennt
   Verbindungsspezifisches DNS-Suffix:

Drahtlos-LAN-Adapter LAN-Verbindung* 11:

   Medienstatus. . . . . . . . . . . : Medium getrennt
   Verbindungsspezifisches DNS-Suffix:

Drahtlos-LAN-Adapter WLAN:

   Verbindungsspezifisches DNS-Suffix:
   Verbindungslokale IPv6-Adresse  . : fe80::18bb:ecc9:8bc3:931a%18
   IPv4-Adresse  . . . . . . . . . . : 192.168.0.149
   Subnetzmaske  . . . . . . . . . . : 255.255.255.0
   Standardgateway . . . . . . . . . : 192.168.0.1
`
    )

    fs.writeFileSync("test-output.json", JSON.stringify(json, null, 2))
}

main()
