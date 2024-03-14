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
import { download } from "electron-dl"
import { Logger } from "../../measurement/services/logger.service"
import fs from "fs"
import nodeUrl from "url"
import { Events } from "../enums/events.enum"

export class WindowManager {
    private static instance = new WindowManager()
    private pdfs: { [key: string]: string } = {}

    static get I() {
        return this.instance
    }

    isSuspended = false

    private constructor() {}

    onQuit() {
        Object.values(this.pdfs).forEach((pdf) => {
            if (fs.existsSync(pdf)) fs.unlinkSync(pdf)
        })
    }

    createWindow() {
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
                !MeasurementRunner.I.isMeasurementInProgress &&
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

        powerMonitor.on("suspend", () => {
            this.isSuspended = true
            if (MeasurementRunner.I.isMeasurementInProgress) {
                MeasurementRunner.I.abortMeasurement()
                LoopService.I.resetTimeout()
            }
            if (
                MeasurementRunner.I.getCurrentPhaseState().phase !==
                EMeasurementStatus.NOT_STARTED
            ) {
                win.webContents.send(Events.APP_SUSPENDED)
            }
        })

        powerMonitor.on("resume", () => {
            this.isSuspended = false
            MeasurementRunner.I.resumeMeasurement({ sender: win })
            win.webContents.send(Events.APP_RESUMED)
        })
    }

    async openPdf(url: string) {
        const { screen } = require("electron")
        const primaryDisplay = screen.getPrimaryDisplay()
        const { width, height } = primaryDisplay.workAreaSize

        let pdfWindow: BrowserWindow | undefined = new BrowserWindow({
            width: Math.max(1280, width),
            height: Math.max(800, height),
            minWidth: Math.min(800, width),
            minHeight: Math.min(600, height),
            webPreferences: {
                plugins: true,
            },
            icon: path.join(__dirname, "assets", "images", "icon-linux.png"),
        })

        let pdf = this.pdfs[url]

        if (!pdf) {
            try {
                const filename =
                    new Date().toISOString().replaceAll(":", ".") + ".pdf"
                const directory = app.getPath("temp")
                const downItem = await download(pdfWindow, url, {
                    directory,
                    filename,
                })
                pdf = nodeUrl.pathToFileURL(downItem.getSavePath()).toString()
                this.pdfs[url] = pdf
                Logger.I.warn(`PDF URL is %s`, pdf)
            } catch (e) {
                Logger.I.error(`PDF download error: %o`, e)
            }
        }

        pdfWindow.loadURL(pdf)
        pdfWindow.setMenu(null)
    }
}
