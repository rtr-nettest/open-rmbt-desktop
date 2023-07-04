require("dotenv").config(process.env.RMBT_DESKTOP_DOTENV_CONFIG_PATH || ".env")
const path = require("path")
const customerConfig = require(path.resolve(
    process.env.ASSETS_FOLDER,
    "forge.config"
))

module.exports = customerConfig
