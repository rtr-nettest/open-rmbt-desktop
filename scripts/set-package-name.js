require("dotenv").config(process.env.RMBT_DESKTOP_DOTENV_CONFIG_PATH || ".env")
const fs = require("fs")
const pack = require("../package.json")

function main() {
    pack.name = process.env.PACK_NAME
    pack.productName = process.env.PACK_PRODUCT_NAME
    pack.description = process.env.PACK_DESCRIPTION
    pack.author = process.env.PACK_AUTHOR
    fs.writeFileSync("package.json", JSON.stringify(pack, null, 2))
}

main()
