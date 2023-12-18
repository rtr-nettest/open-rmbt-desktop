import {
    BrowserWindow,
    Menu,
    app,
    dialog,
    powerMonitor,
    protocol,
    shell,
} from "electron"
import Protocol from "./protocol"
import path from "path"
import { buildMenu } from "./menu"
import { EMeasurementStatus } from "../../measurement/enums/measurement-status.enum"
import { MeasurementRunner } from "../../measurement"
import { LoopService } from "../../measurement/services/loop.service"
import { t } from "../../measurement/services/i18n.service"

export const createWindow = () => {
    if (process.env.DEV !== "true") {
        // Needs to happen before creating/loading the browser window;
        // protocol is only used in prod
        protocol.registerBufferProtocol(
            Protocol.scheme,
            Protocol.requestHandler
        )
    }

    const { screen } = require("electron")
    const primaryDisplay = screen.getPrimaryDisplay()
    const { width, height } = primaryDisplay.workAreaSize

    const win = new BrowserWindow({
        width: Math.min(1280, width),
        height: Math.min(800, height),
        minWidth: Math.min(800, width),
        minHeight: Math.min(600, height),
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            nodeIntegration: true,
        },
        icon: path.join(__dirname, "assets", "images", "icon-linux.png"),
    })

    win.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url)
        return { action: "deny" }
    })

    Menu.setApplicationMenu(buildMenu())

    if (process.env.DEV === "true") {
        win.loadURL("http://localhost:4200/")
        setTimeout(() => {
            win.webContents.openDevTools()
        }, 300)
    } else {
        win.loadURL(`${Protocol.scheme}://index.html`)
    }

    win.on("close", async (event) => {
        if (
            [
                EMeasurementStatus.END,
                EMeasurementStatus.ABORTED,
                EMeasurementStatus.NOT_STARTED,
            ].includes(MeasurementRunner.I.getCurrentPhaseState().phase) &&
            !LoopService.I.loopTimeout
        ) {
            return
        }
        const dialogOpts = {
            type: "warning" as const,
            buttons: [t("Ok"), t("Cancel")],
            title: t("Close app"),
            message: t("The currently running measurement will be aborted"),
        }
        const response = await dialog.showMessageBox(dialogOpts)
        if (response.response !== 0) {
            event.preventDefault()
        }
    })

    powerMonitor.on("suspend", async (event) => {
        if (
            [
                EMeasurementStatus.END,
                EMeasurementStatus.ABORTED,
                EMeasurementStatus.NOT_STARTED,
            ].includes(MeasurementRunner.I.getCurrentPhaseState().phase) &&
            !LoopService.I.loopTimeout
        ) {
            return
        }
        const dialogOpts = {
            type: "warning" as const,
            buttons: [t("Ok")],
            title: t("App was suspended"),
            message: t(
                "The app was suspended. The last running measurement was aborted"
            ),
        }
        const response = await dialog.showMessageBox(dialogOpts)
        if (response.response === 0) {
            app.exit(0)
        }
    })
}
