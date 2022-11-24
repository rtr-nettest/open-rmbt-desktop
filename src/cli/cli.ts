import { config } from "dotenv"
import { runMeasurement } from "../measurement"

config({
    path: process.env.RMBT_DESKTOP_DOTENV_CONFIG_PATH || ".env",
})

runMeasurement({
    platform: process.env.PLATFORM_CLI,
})
