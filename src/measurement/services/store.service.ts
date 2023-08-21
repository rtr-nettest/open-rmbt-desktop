import ElectronStore from "electron-store"
import { Logger } from "./logger.service"

export const CLIENT_UUID = "clienUuid"
export const TERMS_ACCEPTED = "termsAccepted"
export const LAST_NEWS_UID = "lastNewsUid"
export const IP_VERSION = "ipVersion"
export const ACTIVE_LANGUAGE = "activeLanguage"
export const DEFAULT_LANGUAGE = "defaultLanguage"
export const SETTINGS = "settings"
export const ACTIVE_SERVER = "activeServer"

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

    private constructor() {}
}
