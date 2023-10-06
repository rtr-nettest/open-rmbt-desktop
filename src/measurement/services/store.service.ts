import ElectronStore from "electron-store"
import { Logger } from "./logger.service"
import { t } from "./i18n.service"
import { app, dialog } from "electron"
import fsp from "fs/promises"
import cp from "child_process"

export const CLIENT_UUID = "clienUuid"
export const TERMS_ACCEPTED_VERSION = "termsAcceptedVersion"
export const LAST_NEWS_UID = "lastNewsUid"
export const IP_VERSION = "ipVersion"
export const ACTIVE_LANGUAGE = "activeLanguage"
export const DEFAULT_LANGUAGE = "defaultLanguage"
export const SETTINGS = "settings"
export const ACTIVE_SERVER = "activeServer"
export const ACTIVE_CLIENT = "activeClient"

export class Store {
    private static instance = new ElectronStore()

    static get I() {
        return this.instance
    }

    static set(key: string, value: any) {
        Logger.I.info(`Setting ${key} => ${value}`)
        this.I.set(key, value)
    }

    static get(key: string) {
        const value = this.I.get(key)
        // Logger.I.info(`Getting ${key} <= ${value}`)
        return value
    }

    static async wipeDataAndQuit() {
        const dialogOpts = {
            type: "warning" as const,
            buttons: [t("Ok"), t("Cancel")],
            title: t("Delete local data"),
            message: t("Delete local data description"),
        }
        const response = await dialog.showMessageBox(dialogOpts)
        if (response.response === 0) {
            const userData = app.getPath("userData")
            if (process.platform === "win32") {
                const cmd = `timeout /t 1 /nobreak && rd /s /q "${userData}"`
                const p = cp.spawn(cmd, {
                    shell: true,
                    stdio: "ignore",
                    detached: true,
                })
                p.unref()
            } else {
                await fsp.rm(app.getPath("userData"), {
                    recursive: true,
                    force: true,
                })
            }
            app.exit()
        }
    }

    private constructor() {}
}
