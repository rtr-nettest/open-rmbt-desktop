require("dotenv").config(process.env.RMBT_DESKTOP_DOTENV_CONFIG_PATH || ".env")
const fs = require("fs")
const pack = require("../package.json")

function main() {
    if (process.env.FLAVOR === "ont") {
        pack.name = "open-nettest-desktop"
        pack.productName = "Open Nettest"
        pack.description = "Open Nettest Desktop App"
    } else {
        pack.name = "open-rmbt-desktop"
        pack.productName = "RTR-Netztest"
        pack.description = "RTR Desktop App"
    }
    fs.writeFileSync("package.json", JSON.stringify(pack, null, 2))
}

main()
