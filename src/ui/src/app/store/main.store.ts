import { Injectable } from "@angular/core"
import { BehaviorSubject, firstValueFrom, from, tap } from "rxjs"
import { IEnv } from "../../../../electron/interfaces/env.interface"
import { IMainAsset } from "../interfaces/main-asset.interface"
import { IMainProject } from "../interfaces/main-project.interface"
import { IUserSettings } from "../../../../measurement/interfaces/user-settings-response.interface"
import { INewsItem } from "../../../../measurement/interfaces/news.interface"
import { EIPVersion } from "../../../../measurement/enums/ip-version.enum"

@Injectable({
    providedIn: "root",
})
export class MainStore {
    static factory(store: MainStore) {
        return () => firstValueFrom(store.setEnv())
    }

    assets$ = new BehaviorSubject<{ [key: string]: IMainAsset }>({})
    env$ = new BehaviorSubject<IEnv | null>(null)
    project$ = new BehaviorSubject<IMainProject | null>(null)
    settings$ = new BehaviorSubject<IUserSettings | null>(null)
    error$ = new BehaviorSubject<Error | null>(null)
    news$ = new BehaviorSubject<INewsItem[] | null>(null)

    constructor() {
        window.electronAPI.onError((error) => {
            console.error(error)
            this.error$.next(new Error("Server communication error"))
        })
    }

    setEnv() {
        if (this.env$.value) {
            return this.env$
        }
        return from(window.electronAPI.getEnv()).pipe(
            tap((env) => this.env$.next(env))
        )
    }

    registerClient() {
        window.electronAPI
            .registerClient()
            .then((settings) => this.settings$.next(settings))
    }

    setIPVersion(ipVersion?: EIPVersion) {
        const currentEnv = this.env$.value
        if (!currentEnv) {
            return
        }
        if (!ipVersion) {
            this.env$.next({ ...currentEnv, IP_VERSION: null })
            window.electronAPI.setIpVersion(null)
        } else {
            this.env$.next({ ...currentEnv, IP_VERSION: ipVersion })
            window.electronAPI.setIpVersion(ipVersion)
        }
    }
}
