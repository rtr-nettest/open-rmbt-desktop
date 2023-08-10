import * as path from "path"
import * as cp from "child_process"
import { app, dialog, BrowserWindow } from "electron"
import axios from "axios"
import { Logger } from "./logger.service"
import semverGt from "semver/functions/gt"
import * as pack from "../../../package.json"
import { download } from "electron-dl"
import * as fs from "fs"
import { t } from "./i18n.service"

const extensionsMap = {
    win32: "exe",
    darwin: "dmg",
}

interface ILatestReleaseAsset {
    name: string
    browser_download_url: string
}

interface ILatestRelease {
    tag_name: string
    name: string
    draft: boolean
    prerelease: boolean
    assets: ILatestReleaseAsset[]
}

export class AutoUpdater {
    static get I() {
        return this.instance
    }

    private static instance = new AutoUpdater()

    private constructor() {}

    async removeTmpFiles() {
        try {
            for (const ext of Object.values(extensionsMap)) {
                const file = `${pack.productName}-${pack.version}-x64.${ext}`
                const fullPath = path.resolve(app.getPath("temp"), file)
                if (fs.existsSync(fullPath)) {
                    fs.unlinkSync(fullPath)
                }
            }
            cp.execFile(`hdiutil`, ["detach", `/Volumes/${pack.productName}`])
        } catch (e) {}
    }

    async checkForNewRelease() {
        await this.removeTmpFiles()
        try {
            const latestRelease = (
                await axios.get(
                    `${process.env.GITHUB_API_URL}/releases/latest`,
                    {
                        headers: {
                            accept: "application/vnd.github+json",
                            authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
                            "X-GitHub-Api-Version": "2022-11-28",
                        },
                    }
                )
            ).data as ILatestRelease | null
            const latestVersion =
                latestRelease?.tag_name.replace("v", "") ?? pack.version
            const file = latestRelease?.assets.find((a) => {
                return (
                    (process.platform === "darwin" &&
                        a.name.endsWith(extensionsMap.darwin)) ||
                    (process.platform === "win32" &&
                        a.name.endsWith(extensionsMap.win32))
                )
            })
            if (semverGt(latestVersion, pack.version) && file) {
                const dialogOpts = {
                    type: "info" as const,
                    buttons: [t("Download and install"), t("Later")],
                    title: t("Application Update"),
                    message: latestRelease!.name,
                    detail: t(
                        "A new version is available. Would you like to install it?"
                    ),
                }
                const response = await dialog.showMessageBox(dialogOpts)
                if (response.response === 0) {
                    await this.downloadLatestRelease(file)
                }
            }
        } catch (e) {
            Logger.I.error(e)
        }
    }

    async downloadLatestRelease(file: ILatestReleaseAsset) {
        if (!file?.browser_download_url) {
            return
        }
        const pkgPath = path.join(app.getPath("temp"), file.name)
        const focusedWindow = BrowserWindow.getFocusedWindow()
        if (!focusedWindow) {
            return
        }
        await download(focusedWindow, file.browser_download_url, {
            directory: app.getPath("temp"),
        })
        const dialogOpts = {
            type: "info" as const,
            buttons: [t("Install")],
            title: t("Application Update"),
            message: t("The new version is ready for installation."),
        }
        const response = await dialog.showMessageBox(dialogOpts)
        if (response.response === 0) {
            this.installPackage(pkgPath)
        }
    }

    installPackage(pkgPath: string) {
        if (process.platform === "darwin") {
            setTimeout(() => {
                cp.execFile("open", [pkgPath])
                app.quit()
            }, 300)
        } else if (process.platform === "win32") {
            setTimeout(() => {
                cp.exec(pkgPath, () => {
                    app.quit()
                })
            }, 300)
        }
    }
}
