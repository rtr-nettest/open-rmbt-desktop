import { config } from "dotenv"
import { app, BrowserWindow, ipcMain, protocol, shell } from "electron"
import path from "path"
import {
    getBasicNetworkInfo,
    getCurrentPhaseState,
    getMeasurementResult,
    runMeasurement,
} from "../measurement"
import { Events } from "./events"
import Protocol from "./protocol"

config({
    path: process.env.RMBT_DESKTOP_DOTENV_CONFIG_PATH || ".env",
})

const createWindow = () => {
    if (process.env.DEV !== "true") {
        // Needs to happen before creating/loading the browser window;
        // protocol is only used in prod
        protocol.registerBufferProtocol(
            Protocol.scheme,
            Protocol.requestHandler
        )
    }

    const win = new BrowserWindow({
        width: 1200,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            nodeIntegration: true,
        },
    })

    win.webContents.setWindowOpenHandler(({ url }) => {
        if (
            process.env.FULL_HISTORY_RESUlT_URL &&
            url.startsWith(process.env.FULL_HISTORY_RESUlT_URL)
        ) {
            shell.openExternal(url)
        }
        return { action: "deny" }
    })

    if (process.env.DEV === "true") {
        win.loadURL("http://localhost:4200/")
        win.webContents.openDevTools()
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

ipcMain.on(Events.RUN_MEASUREMENT, (event) => {
    const webContents = event.sender
    runMeasurement().catch((e) => {
        webContents.send(Events.ERROR, e)
    })
})

ipcMain.handle(Events.GET_BASIC_NETWORK_INFO, () => {
    return getBasicNetworkInfo()
})

ipcMain.handle(Events.GET_MEASUREMENT_STATE, () => {
    return getCurrentPhaseState()
})

ipcMain.handle(Events.GET_MEASUREMENT_RESULT, async (event, testUuid) => {
    const webContents = event.sender
    try {
        return await getMeasurementResult(testUuid)
    } catch (e) {
        webContents.send(Events.ERROR, e)
    }
})

app.whenReady().then(() => createWindow())
