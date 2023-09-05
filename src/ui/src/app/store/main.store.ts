import { Injectable } from "@angular/core"
import {
    BehaviorSubject,
    Observable,
    firstValueFrom,
    from,
    lastValueFrom,
    tap,
} from "rxjs"
import { IEnv } from "../../../../electron/interfaces/env.interface"
import { IMainAsset } from "../interfaces/main-asset.interface"
import { IMainProject } from "../interfaces/main-project.interface"
import { IUserSettings } from "../../../../measurement/interfaces/user-settings-response.interface"
import { INewsItem } from "../../../../measurement/interfaces/news.interface"
import { EIPVersion } from "../../../../measurement/enums/ip-version.enum"
import { Router } from "@angular/router"
import { ERoutes } from "../enums/routes.enum"
import { Translation, TranslocoService } from "@ngneat/transloco"
import { TranslocoHttpLoader } from "../transloco-root.module"

@Injectable({
    providedIn: "root",
})
export class MainStore {
    static factory(store: MainStore) {
        return () => firstValueFrom(store.setEnv())
    }

    assets$ = new BehaviorSubject<{ [key: string]: IMainAsset }>({})
    env$ = new BehaviorSubject<IEnv | null>(null)
    inProgress$ = new BehaviorSubject<boolean>(false)
    project$ = new BehaviorSubject<IMainProject | null>(null)
    settings$ = new BehaviorSubject<IUserSettings | null>(null)
    error$ = new BehaviorSubject<Error | null>(null)
    news$ = new BehaviorSubject<INewsItem[] | null>(null)
    referrer$ = new BehaviorSubject<string | null>(null)

    constructor(
        private router: Router,
        private transloco: TranslocoService,
        private transLoader: TranslocoHttpLoader
    ) {
        window.electronAPI.onError((error) => {
            console.error(error)
            this.error$.next(new Error("Server communication error"))
        })
        window.electronAPI.onOpenSettings(() => {
            this.router.navigate(["/", ERoutes.SETTINGS])
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

    setClient(client: string) {
        window.electronAPI.setActiveClient(client)
        const newEnv = { ...this.env$.value, X_NETTEST_CLIENT: client } as IEnv
        this.env$.next(newEnv)
        this.project$.next(null)
        const loader$ = this.transLoader.getTranslation(
            this.transloco.getActiveLang()
        ) as Observable<Translation>
        lastValueFrom(loader$).then((dict) => {
            this.transloco.setTranslation(dict)
        })
    }
}
