import { Logger } from "./logger.service"
import { t } from "./i18n.service"
import { app, dialog } from "electron"
import fs from "fs"
import fsp from "fs/promises"
import cp from "child_process"
import path from "path"

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
    private static instance: Store
    static get I() {
        if (!this.instance) {
            this.instance = new Store()
        }
        return this.instance
    }

    private data: Record<string, any>
    private filePath: string

    private constructor(fileName: string = "config.json") {
        const userDataPath = app ? app.getPath("userData") : "../"
        this.filePath = path.resolve(userDataPath, fileName)

        try {
            // Try to read the file and parse it as JSON
            this.data = JSON.parse(fs.readFileSync(this.filePath, "utf-8"))
        } catch (error) {
            // If file read or parse fails, start with an empty object
            this.data = {}
        }
    }

    // Get a value from the store
    get(key: string): any {
        return this.data[key]
    }

    // Set a value in the store
    set(key: string, value: any): void {
        this.data[key] = value
        this.save()
    }

    // Delete a value from the store
    delete(key: string): void {
        delete this.data[key]
        this.save()
    }

    async wipeDataAndQuit() {
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

    // Save the current state to disk
    private save(): void {
        fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2))
    }
}
