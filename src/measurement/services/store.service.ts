import ElectronStore from "electron-store"

export class Store {
    private static clientUuidKey = "clienUuid"
    private static instance = new ElectronStore()

    static get I() {
        return this.instance
    }

    static get clientUuid() {
        return Store.I.get(Store.clientUuidKey) as string
    }

    static set clientUuid(newValue: string) {
        Store.I.set(Store.clientUuidKey, newValue)
    }

    private constructor() {}
}
