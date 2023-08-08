import * as path from "path"
import * as cp from "child_process"
import { app, dialog, BrowserWindow } from "electron"
import axios from "axios"
import { Logger } from "./logger.service"
import semverGt from "semver/functions/gt"
import * as pack from "../../../package.json"
import { download } from "electron-dl"

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

    async checkForNewRelease() {
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
            if (
                semverGt(latestVersion, pack.version) &&
                latestRelease?.assets.length
            ) {
                const dialogOpts = {
                    type: "info" as const,
                    buttons: ["Download and install", "Later"],
                    title: "Application Update",
                    message: latestRelease.name,
                    detail: "A new version is available. Would you like to install it?",
                }
                const response = await dialog.showMessageBox(dialogOpts)
                if (response.response === 0) {
                    await this.downloadLatestRelease(latestRelease)
                }
            }
        } catch (e) {
            Logger.I.error(e)
        }
    }

    async downloadLatestRelease(latestRelease: ILatestRelease) {
        const file = latestRelease?.assets.find((a) => {
            return (
                (process.platform === "darwin" && a.name.match(/pkg$/i)) ||
                (process.platform === "win32" && a.name.match(/appx$/i))
            )
        })
        if (!file?.browser_download_url) {
            return
        }
        const pkgPath = path.join(app.getPath("temp"), file.name)
        await download(
            BrowserWindow.getFocusedWindow()!,
            file.browser_download_url,
            {
                directory: app.getPath("temp"),
            }
        )
        const dialogOpts = {
            type: "info" as const,
            buttons: ["Install"],
            title: "Application Update",
            message: latestRelease.name,
            detail: "The new version is ready for installation.",
        }
        const response = await dialog.showMessageBox(dialogOpts)
        if (response.response === 0) {
            this.installPackage(pkgPath)
        }
    }

    installPackage(pkgPath: string) {
        if (process.platform === "darwin") {
            setTimeout(() => {
                cp.execFile(`open`, [pkgPath])
                app.quit()
            }, 300)
        } else if (process.platform === "win32") {
            setTimeout(() => {
                cp.exec(pkgPath, () => {
                    app.quit()
                })
            }, 500)
        }
    }
}
