import ElectronStore from "electron-store"

export const CLIENT_UUID = "clienUuid"
export const TERMS_ACCEPTED = "termsAccepted"
export const LAST_NEWS_UID = "lastNewsUid"
export const IP_VERSION = "ipVersion"
export const LANGUAGE = "language"

export class Store {
    private static instance = new ElectronStore()

    static get I() {
        return this.instance
    }

    private constructor() {}
}
