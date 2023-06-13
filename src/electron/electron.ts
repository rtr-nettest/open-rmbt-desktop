import { app, BrowserWindow, ipcMain, protocol, shell } from "electron"
if (require("electron-squirrel-startup")) app.quit()
import path from "path"
import { MeasurementRunner } from "../measurement"
import { Events } from "./enums/events.enum"
import { IEnv } from "./interfaces/env.interface"
import Protocol from "./protocol"

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
        const historyUrl = new URL(process.env.FULL_HISTORY_RESUlT_URL ?? "")
        const thisUrl = new URL(url)
        if (thisUrl.hostname === historyUrl.hostname) {
            shell.openExternal(url)
        }
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
    if (process.platform !== "darwin") app.quit()
})

app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

ipcMain.handle(Events.REGISTER_CLIENT, async (event) => {
    const webContents = event.sender
    try {
        return await MeasurementRunner.I.registerClient()
    } catch (e) {
        webContents.send(Events.ERROR, e)
    }
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
