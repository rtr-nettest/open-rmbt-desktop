import { Injectable } from "@angular/core"
import { BehaviorSubject } from "rxjs"
import { IEnv } from "../../../../electron/interfaces/env.interface"
import { IMainAsset } from "../interfaces/main-asset.interface"
import { IMainProject } from "../interfaces/main-project.interface"
import { IUserSettings } from "../../../../measurement/interfaces/user-settings-response.interface"

@Injectable({
    providedIn: "root",
})
export class MainStore {
    assets$ = new BehaviorSubject<{ [key: string]: IMainAsset }>({})
    env$ = new BehaviorSubject<IEnv | null>(null)
    project$ = new BehaviorSubject<IMainProject | null>(null)
    settings$ = new BehaviorSubject<IUserSettings | null>(null)
    error$ = new BehaviorSubject<Error | null>(null)

    constructor() {
        window.electronAPI.onError((error) => {
            console.error(error)
            this.error$.next(new Error("Server communication error"))
        })
        window.electronAPI.getEnv().then((env) => this.env$.next(env))
    }

    registerClient() {
        window.electronAPI
            .registerClient()
            .then((settings) => this.settings$.next(settings))
    }
}
