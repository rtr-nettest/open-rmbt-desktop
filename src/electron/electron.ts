import { app, BrowserWindow, ipcMain, protocol, shell } from "electron"
if (require("electron-squirrel-startup")) app.quit()
import path from "path"
import { MeasurementRunner } from "../measurement"
import { Events } from "./enums/events.enum"
import { IEnv } from "./interfaces/env.interface"
import Protocol from "./protocol"
import {
    LANGUAGE,
    IP_VERSION,
    Store,
    TERMS_ACCEPTED,
} from "../measurement/services/store.service"
import { CrowdinService } from "../measurement/services/crowdin.service"
import { ControlServer } from "../measurement/services/control-server.service"
import pack from "../../package.json"
import { EIPVersion } from "../measurement/enums/ip-version.enum"

const createWindow = () => {
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
        width: 1280,
        height: 800,
        minWidth: Math.min(800, width),
        minHeight: Math.min(600, height),
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            nodeIntegration: true,
        },
    })

    win.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url)
        return { action: "deny" }
    })

    if (process.env.DEV === "true") {
        win.webContents.openDevTools()
        win.loadURL("http://localhost:4200/")
    } else {
        win.loadURL(`${Protocol.scheme}://index.html`)
    }
}

// Needs to be called before app is ready;
// gives our scheme access to load relative files,
// as well as local storage, cookies, etc.
// https://electronjs.org/docs/api/protocol#protocolregisterschemesasprivilegedcustomschemes
protocol.registerSchemesAsPrivileged([
    {
        scheme: Protocol.scheme,
        privileges: {
            standard: true,
            secure: true,
        },
    },
])

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit()
    } else {
        MeasurementRunner.I.abortMeasurement()
    }
})

app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

ipcMain.on(Events.QUIT, () => {
    app.quit()
})

ipcMain.handle(Events.GET_TRANSLATIONS, async (event, lang: string) => {
    return await CrowdinService.I.getTranslations(lang)
})

ipcMain.handle(Events.GET_NEWS, async () => {
    return await ControlServer.I.getNews()
})

ipcMain.on(Events.ACCEPT_TERMS, (event, terms: string) => {
    Store.I.set(TERMS_ACCEPTED, terms)
})

ipcMain.handle(Events.REGISTER_CLIENT, async (event) => {
    const webContents = event.sender
    try {
        return await MeasurementRunner.I.registerClient()
    } catch (e) {
        webContents.send(Events.ERROR, e)
    }
})

ipcMain.on(Events.SET_IP_VERSION, (event, ipv: EIPVersion | null) => {
    Store.I.set(IP_VERSION, ipv)
})

ipcMain.on(Events.SET_LANGUAGE, (event, language: string) => {
    Store.I.set(LANGUAGE, language)
})

ipcMain.on(Events.RUN_MEASUREMENT, async (event) => {
    const webContents = event.sender
    try {
        await MeasurementRunner.I.runMeasurement()
    } catch (e) {
        webContents.send(Events.ERROR, e)
    }
})

ipcMain.on(Events.ABORT_MEASUREMENT, () => {
    MeasurementRunner.I.abortMeasurement()
})

ipcMain.handle(Events.GET_ENV, (): IEnv => {
    return {
        CMS_URL: process.env.CMS_URL || "",
        FLAVOR: process.env.FLAVOR || "rtr",
        X_NETTEST_CLIENT: process.env.X_NETTEST_CLIENT || "",
        ENABLE_LOOP_MODE: process.env.ENABLE_LOOP_MODE || "",
        CROWDIN_UPDATE_AT_RUNTIME: process.env.CROWDIN_UPDATE_AT_RUNTIME || "",
        APP_VERSION: pack.version,
        REPO_URL: pack.repository,
        ENABLE_LANGUAGE_SWITCH: process.env.ENABLE_LANGUAGE_SWITCH || "",
        IP_VERSION: (Store.I.get(IP_VERSION) as string) || "",
        TERMS_ACCEPTED: (Store.I.get(TERMS_ACCEPTED) as boolean) || false,
        LANGUAGE: Store.I.get(LANGUAGE) as string,
    }
})

ipcMain.handle(Events.GET_CPU_USAGE, () => {
    return MeasurementRunner.I.getCPUUsage()
})

ipcMain.handle(Events.GET_MEASUREMENT_STATE, () => {
    return MeasurementRunner.I.getCurrentPhaseState()
})

ipcMain.handle(Events.GET_MEASUREMENT_RESULT, async (event, testUuid) => {
    const webContents = event.sender
    try {
        return await MeasurementRunner.I.getMeasurementResult(testUuid)
    } catch (e) {
        webContents.send(Events.ERROR, e)
    }
})

app.whenReady().then(() => createWindow())
app.disableHardwareAcceleration()
