require("dotenv").config(process.env.RMBT_DESKTOP_DOTENV_CONFIG_PATH || ".env")
const fs = require("fs")
const pack = require("../package.json")

function main() {
    pack.gitInfo = {}
    fs.writeFileSync("package.json", JSON.stringify(pack, null, 4))
}

main()
