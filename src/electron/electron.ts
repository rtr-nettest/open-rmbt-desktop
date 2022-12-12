import { config } from "dotenv"
import { app, BrowserWindow, ipcMain } from "electron"
import path from "path"
import { getCurrentPhaseState, runMeasurement } from "../measurement"
import { Events } from "./events"

config({
    path: process.env.RMBT_DESKTOP_DOTENV_CONFIG_PATH || ".env",
})

const createWindow = () => {
    const win = new BrowserWindow({
        width: 1200,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            nodeIntegration: true,
        },
    })

    if (process.env.DEV === "true") {
        win.loadURL("http://localhost:4200/")
        win.webContents.openDevTools()
    } else {
        win.loadFile(path.join(__dirname, "index.html"))
        win.webContents.openDevTools()
    }
}

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit()
})

app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

ipcMain.on(Events.RUN_MEASUREMENT, (event) => {
    const webContents = event.sender
    runMeasurement().then(() => {
        webContents.send(Events.MEASUREMENT_FINISH, getCurrentPhaseState())
    })
})

ipcMain.handle(Events.GET_MEASUREMENT_STATE, () => {
    return getCurrentPhaseState()
})

app.whenReady().then(() => createWindow())
