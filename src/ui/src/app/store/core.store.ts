import { Injectable } from "@angular/core"
import { BehaviorSubject } from "rxjs"
import { IEnv } from "../../../../electron/interfaces/env.interface"

@Injectable({
    providedIn: "root",
})
export class CoreStore {
    env$ = new BehaviorSubject<IEnv | null>(null)

    init() {
        window.electronAPI.getEnv().then((env) => this.env$.next(env))
    }
}
