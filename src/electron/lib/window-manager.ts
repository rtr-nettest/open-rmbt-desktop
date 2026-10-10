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
import { MeasurementRunner } from "../../measurement"
import { LoopService } from "../../measurement/services/loop.service"
import { t } from "../../measurement/services/i18n.service"
import { Logger } from "../../measurement/services/logger.service"
import fs from "fs"
import nodeUrl from "url"
import { Events } from "../enums/events.enum"

export class WindowManager {
    private static instance = new WindowManager()
    private pdfs: { [key: string]: string } = {}
    // Live PDF viewer windows, keyed by the source URL (or caller key). Used to
    // reuse/focus an already-open window instead of spawning a new one.
    private pdfWindows: { [key: string]: BrowserWindow } = {}
    // Temp files written for PDFs delivered as raw bytes (openPdfData), keyed the
    // same way, so a reopen reuses the file and they can be cleaned up on quit.
    private pdfFiles: { [key: string]: string } = {}

    static get I() {
        return this.instance
    }

    isSuspended = false

    private constructor() {}

    onQuit() {
        Object.values(this.pdfs).forEach((pdf) => {
            if (fs.existsSync(pdf)) fs.unlinkSync(pdf)
        })
        Object.values(this.pdfFiles).forEach((file) => {
            try {
                if (fs.existsSync(file)) fs.unlinkSync(file)
            } catch {
                // best-effort cleanup
            }
        })
    }

    createWindow() {
        if (process.env.DEV !== "true") {
            // Needs to happen before creating/loading the browser window;
            // protocol is only used in prod
            protocol.handle(Protocol.scheme, Protocol.handle)
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

        // Diagnostics: record whether the renderer actually loaded & bootstrapped
        // (helps catch protocol/MIME regressions where the shell renders as text).
        const diag = (msg: string) => {
            try {
                fs.appendFileSync(
                    path.join(app.getPath("userData"), "render-diag.log"),
                    `${new Date().toISOString()} ${msg}\n`
                )
            } catch {}
        }
        win.webContents.on("did-fail-load", (_e, code, desc, url) =>
            diag(`did-fail-load ${code} ${desc} ${url}`)
        )
        win.webContents.on("did-finish-load", async () => {
            try {
                const n = await win.webContents.executeJavaScript(
                    'document.querySelector("app-root")?.childElementCount ?? -1'
                )
                diag(`did-finish-load app-root children=${n}`)
            } catch (e) {
                diag(`did-finish-load exec-error ${e}`)
            }
        })

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
            // Only notify the renderer (which shows the "measurement aborted"
            // alert) when a measurement was actually running at suspend time.
            // Otherwise the alert would also pop up after an already-finished
            // measurement (phase END/ERROR/ABORTED), i.e. with nothing ongoing.
            if (MeasurementRunner.I.isMeasurementInProgress) {
                MeasurementRunner.I.abortMeasurement()
                LoopService.I.resetTimeout()
                win.webContents.send(Events.APP_SUSPENDED)
            }
        })

        powerMonitor.on("resume", () => {
            this.isSuspended = false
            MeasurementRunner.I.resumeMeasurement({ sender: win })
            win.webContents.send(Events.APP_RESUMED)
        })
    }

    // Focus an already-open PDF window for this key, if any. Returns true when a
    // live window was found and focused (so the caller should not open another).
    private focusExistingPdf(key: string): boolean {
        const existing = this.pdfWindows[key]
        if (existing && !existing.isDestroyed()) {
            if (existing.isMinimized()) existing.restore()
            existing.focus()
            return true
        }
        return false
    }

    private createPdfWindow(key: string): BrowserWindow {
        const { screen } = require("electron")
        const primaryDisplay = screen.getPrimaryDisplay()
        const { width, height } = primaryDisplay.workAreaSize

        const pdfWindow = new BrowserWindow({
            width: Math.max(1280, width),
            height: Math.max(800, height),
            minWidth: Math.min(800, width),
            minHeight: Math.min(600, height),
            webPreferences: {
                plugins: true,
            },
            icon: path.join(__dirname, "assets", "images", "icon-linux.png"),
        })
        pdfWindow.setMenu(null)
        this.pdfWindows[key] = pdfWindow
        pdfWindow.on("closed", () => {
            if (this.pdfWindows[key] === pdfWindow) {
                delete this.pdfWindows[key]
            }
        })
        return pdfWindow
    }

    async openPdf(url: string) {
        // Reuse a single window per PDF URL. If one is already open (or still
        // downloading) for this URL, focus it instead of spawning another —
        // this is what previously let the certified flow and repeated exports
        // stack several identical PDF windows.
        if (this.focusExistingPdf(url)) {
            return
        }
        // Register the window synchronously (before the async download) so a
        // second call for the same URL during the download is deduplicated too.
        const pdfWindow = this.createPdfWindow(url)

        let pdf = this.pdfs[url]

        if (!pdf) {
            try {
                const filename =
                    new Date().toISOString().replaceAll(":", ".") + ".pdf"
                const directory = app.getPath("temp")
                const downItem = await (
                    await import("electron-dl")
                ).download(pdfWindow, url, {
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

        // The window may have been closed by the user while the download was in
        // flight; don't try to load into a destroyed window.
        if (pdfWindow.isDestroyed()) {
            return
        }

        if (!pdf) {
            // Download failed and nothing was cached — close the blank window
            // rather than leaving an empty viewer open.
            pdfWindow.close()
            return
        }

        pdfWindow.loadURL(pdf)
    }

    // Open a PDF delivered as raw bytes (e.g. the certified export, which the
    // backend returns directly from the POST rather than as a downloadable URL).
    // The bytes are written to a temp file and shown in a reused viewer window
    // keyed by `key` (so repeated opens focus the same window).
    async openPdfData(data: ArrayBuffer | Uint8Array, key?: string) {
        const windowKey = key || `pdf-${Date.now()}`
        if (this.focusExistingPdf(windowKey)) {
            return
        }

        let filePath = this.pdfFiles[windowKey]
        if (!filePath || !fs.existsSync(filePath)) {
            try {
                filePath = path.join(
                    app.getPath("temp"),
                    `rtr-pdf-${Date.now()}.pdf`,
                )
                fs.writeFileSync(filePath, Buffer.from(data as any))
                this.pdfFiles[windowKey] = filePath
                Logger.I.warn(`PDF written to %s`, filePath)
            } catch (e) {
                Logger.I.error(`PDF write error: %o`, e)
                return
            }
        }

        const pdfWindow = this.createPdfWindow(windowKey)
        pdfWindow.loadURL(nodeUrl.pathToFileURL(filePath).toString())
    }
}
