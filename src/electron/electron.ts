import { app, BrowserWindow, ipcMain } from "electron"
import path from "path"
import {
    getCurrentDownload,
    getCurrentPing,
    getCurrentUpload,
    runMeasurement,
} from "../measurement"
import { Events } from "./events"

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
        win.loadURL("http://localhost:5173/")
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
        webContents.send(Events.MEASUREMENT_FINISH, [
            getCurrentPing(),
            getCurrentDownload(),
            getCurrentUpload(),
        ])
    })
})

ipcMain.handle(Events.GET_CURRENT_PING, () => {
    return getCurrentPing()
})

ipcMain.handle(Events.GET_CURRENT_DOWNLOAD, () => {
    return getCurrentDownload()
})

ipcMain.handle(Events.GET_CURRENT_UPLOAD, () => {
    return getCurrentUpload()
})

app.whenReady().then(() => createWindow())
