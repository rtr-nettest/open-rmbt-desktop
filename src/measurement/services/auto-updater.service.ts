import * as path from "path"
import * as cp from "child_process"
import { app, dialog, BrowserWindow } from "electron"
import axios from "axios"
import { Logger } from "./logger.service"
import semverGt from "semver/functions/gt"
import * as pack from "../../../package.json"
import { download } from "electron-dl"
import * as fs from "fs"

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
            cp.execFileSync(`hdiutil`, [
                "detach",
                `/Volumes/${pack.productName}`,
            ])
            for (const file in fs.readdirSync(app.getPath("temp"))) {
                if (file.includes(pack.productName)) {
                    cp.execFileSync("rm", [
                        "-rf",
                        path.resolve(app.getPath("temp"), file),
                    ])
                }
            }
        } catch (e) {}
    }

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
            const file = latestRelease?.assets.find((a) => {
                return (
                    (process.platform === "darwin" && a.name.match(/dmg$/i)) ||
                    (process.platform === "win32" && a.name.match(/appx$/i))
                )
            })
            if (semverGt(latestVersion, pack.version) && file) {
                const dialogOpts = {
                    type: "info" as const,
                    buttons: ["Download and install", "Later"],
                    title: "Application Update",
                    message: latestRelease!.name,
                    detail: "A new version is available. Would you like to install it?",
                }
                const response = await dialog.showMessageBox(dialogOpts)
                if (response.response === 0) {
                    await this.removeTmpFiles()
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
            message: "",
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
