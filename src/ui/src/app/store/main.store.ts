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
import { IUserSettings } from "../../../../measurement/interfaces/user-settings-response.interface"
import { INewsItem } from "../../../../measurement/interfaces/news.interface"
import { EIPVersion } from "../../../../measurement/enums/ip-version.enum"
import { Router } from "@angular/router"
import { I18nService, Translation } from "src/app/services/i18n.service"
import { IJitterInfo } from "../../../../measurement/interfaces/jitter-info.interface"
import { IPInfo } from "../../../../measurement/interfaces/ip-info.interface"

@Injectable({
    providedIn: "root",
})
export class MainStore {
    static factory(store: MainStore) {
        return () => firstValueFrom(store.setEnv())
    }

    env$ = new BehaviorSubject<IEnv | null>(null)
    inProgress$ = new BehaviorSubject<boolean>(false)
    isOnline$ = new BehaviorSubject<boolean>(navigator.onLine)
    jitterInfo$ = new BehaviorSubject<IJitterInfo | null>({
        jitter: 1,
        packetLoss: 1,
        ping: 1,
    })
    ipInfo$ = new BehaviorSubject<IPInfo | null>(null)
    settings$ = new BehaviorSubject<IUserSettings | null>(null)
    error$ = new BehaviorSubject<Error | null>(null)
    news$ = new BehaviorSubject<INewsItem[] | null>(null)
    referrer$ = new BehaviorSubject<string | null>(null)
    maxJitter = 5

    get api() {
        return this.settings$.value?.urls
    }

    constructor(
        private router: Router,
        private transloco: I18nService,
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
            tap((env) => this.env$.next(env)),
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
                }),
            )
        }
        return of(0)
    }

    registerClient() {
        window.electronAPI.onSetIp((settings) => {
            this.isOnline$.next(
                !!(settings.ipInfo?.publicV4 || settings.ipInfo?.publicV6),
            )
            this.ipInfo$.next(settings.ipInfo ?? null)
        })
        window.electronAPI
            .registerClient()
            .then((settings) => this.settings$.next(settings))
    }

    /**
     * Resolve the client settings, which carry the server URLs used for the
     * CSV/PDF exports (see the `api` getter). Returns the cached settings when
     * already loaded, otherwise registers the client once and caches the
     * result. registerClient() is only called by the home/settings screens, so
     * flows reached without passing through them (e.g. the certified
     * measurement wizard) would otherwise have `api` undefined and build
     * broken "undefined/export/pdf/..." URLs.
     */
    ensureSettings(): Observable<IUserSettings | null> {
        if (this.settings$.value?.urls) {
            return of(this.settings$.value)
        }
        return from(window.electronAPI.registerClient()).pipe(
            tap((settings) => this.settings$.next(settings)),
        )
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
