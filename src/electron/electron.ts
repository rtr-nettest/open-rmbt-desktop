import { app, BrowserWindow, ipcMain } from "electron"
import path from "path"
import { runMeasurement } from "../measurement"

const createWindow = () => {
    const win = new BrowserWindow({
        width: 1200,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            nodeIntegration: true,
        },
    })

    win.loadFile(path.join(__dirname, "..", "..", "index.html"))
    win.webContents.openDevTools()
}

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit()
})

app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

ipcMain.on("run-measurement", (event) => {
    const webContents = event.sender
    const win = BrowserWindow.fromWebContents(webContents)
    win?.setTitle("Running measurement")
    runMeasurement().then(() => {
        win?.setTitle("Measurement finished")
    })
})

app.whenReady().then(() => createWindow())
