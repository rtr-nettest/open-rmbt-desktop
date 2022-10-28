import { app, BrowserWindow } from "electron"
import path from "path"

function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
        },
    })

    win.loadFile(path.join(__dirname, "..", "index.html"))
}

async function main() {
    await app.whenReady()
    createWindow()

    app.on("window-all-closed", () => {
        if (process.platform !== "darwin") app.quit()
    })

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
}

main()
