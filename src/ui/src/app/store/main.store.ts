import { Injectable } from "@angular/core"
import {
    BehaviorSubject,
    Observable,
    firstValueFrom,
    from,
    interval,
    lastValueFrom,
    of,
    tap,
} from "rxjs"
import { IEnv } from "../../../../electron/interfaces/env.interface"
import { IMainAsset } from "../interfaces/main-asset.interface"
import { IMainProject } from "../interfaces/main-project.interface"
import { IUserSettings } from "../../../../measurement/interfaces/user-settings-response.interface"
import { INewsItem } from "../../../../measurement/interfaces/news.interface"
import { EIPVersion } from "../../../../measurement/enums/ip-version.enum"
import { Router } from "@angular/router"
import { Translation, TranslocoService } from "@ngneat/transloco"
import { TranslocoHttpLoader } from "../transloco-root.module"
import { IMainPage } from "../interfaces/main-page.interface"
import { IJitterInfo } from "../../../../measurement/interfaces/jitter-info.interface"

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
    jitterInfo$ = new BehaviorSubject<IJitterInfo | null>({
        jitter: 1,
        packetLoss: 1,
        ping: 1,
    })
    project$ = new BehaviorSubject<IMainProject | null>(null)
    settings$ = new BehaviorSubject<IUserSettings | null>(null)
    error$ = new BehaviorSubject<Error | null>(null)
    news$ = new BehaviorSubject<INewsItem[] | null>(null)
    referrer$ = new BehaviorSubject<string | null>(null)
    terms$ = new BehaviorSubject<IMainPage | null>(null)
    maxJitter = 5

    constructor(
        private router: Router,
        private transloco: TranslocoService,
        private transLoader: TranslocoHttpLoader
    ) {
        window.electronAPI.onError((error) => {
            console.error(error)
            this.error$.next(new Error("Server communication error"))
        })
        window.electronAPI.onOpenScreen((route) => {
            this.router.navigate(["/", route])
        })
    }

    setEnv() {
        if (this.env$.value) {
            return this.env$
        }
        return from(window.electronAPI.getEnv()).pipe(
            tap((env) => {
                this.env$.next(env)
            })
        )
    }

    startLoggingJitter() {
        if (this.env$.value?.ENABLE_HOME_SCREEN_JITTER_BOX) {
            return interval(1000).pipe(
                tap(() => {
                    const newValue =
                        this.jitterInfo$.value!.jitter < this.maxJitter
                            ? this.jitterInfo$.value!.jitter + 1
                            : 1
                    this.jitterInfo$.next({
                        jitter: newValue,
                        packetLoss: newValue,
                        ping: newValue,
                    })
                })
            )
        }
        return of(0)
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
