require("dotenv").config(process.env.RMBT_DESKTOP_DOTENV_CONFIG_PATH || ".env")
const fs = require("fs")
const pack = require("../package.json")

function main() {
    pack.name = process.env.PACK_NAME || pack.name
    pack.productName = process.env.PACK_PRODUCT_NAME || pack.productName
    pack.description = process.env.PACK_DESCRIPTION || pack.description
    pack.author = process.env.PACK_AUTHOR || pack.author
    fs.writeFileSync("package.json", JSON.stringify(pack, null, 2))
}

main()
