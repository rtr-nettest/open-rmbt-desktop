import { config } from "dotenv"
import { ControlServerService } from "./services/control-server.service"

export async function main() {
    config({
        path: process.env.DOTENV_CONFIG_PATH || ".env",
    })

    const controlServer = new ControlServerService()
    try {
        const measurementServer = await controlServer.getTestServerFromApi()
        const settings = await controlServer.getUserSettings()
    } catch (err) {
        console.error(err)
    }
}

main()
