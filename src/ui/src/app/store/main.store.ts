import { Injectable } from "@angular/core"
import {
    BehaviorSubject,
    lastValueFrom,
    Observable,
    of,
    switchMap,
    tap,
} from "rxjs"
import { IEnv } from "../../../../electron/interfaces/env.interface"
import { IMainAsset } from "../interfaces/main-asset.interface"
import { IMainProject } from "../interfaces/main-project.interface"
import { CMSService } from "../services/cms.service"

@Injectable({
    providedIn: "root",
})
export class MainStore {
    assets$ = new BehaviorSubject<{ [key: string]: IMainAsset }>({})
    env$ = new BehaviorSubject<IEnv | null>(null)
    project$ = new BehaviorSubject<IMainProject | null>(null)

    constructor() {}

    init() {
        window.electronAPI.getEnv().then((env) => this.env$.next(env))
    }
}
