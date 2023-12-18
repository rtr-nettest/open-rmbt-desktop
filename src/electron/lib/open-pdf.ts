import { BrowserWindow, app } from "electron"
import path from "path"
import fs from "fs"
import { download } from "electron-dl"
import { Logger } from "../../measurement/services/logger.service"

export const openPdf = async (url: string) => {
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

    const filename = new Date().toISOString() + ".pdf"
    const downItem = await download(pdfWindow, url, {
        directory: app.getPath("temp"),
        filename,
    })

    Logger.I.warn(`The PDF was downloaded to %o`, downItem)

    pdfWindow.loadURL("file://" + downItem.getSavePath())

    pdfWindow.setMenu(null)

    pdfWindow.on("closed", function () {
        if (fs.existsSync(downItem.getSavePath()))
            fs.unlinkSync(downItem.getSavePath())
        pdfWindow = undefined
    })
}
