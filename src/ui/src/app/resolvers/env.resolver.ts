import { Injectable } from "@angular/core"
import { Router } from "@angular/router"
import { TranslocoService } from "@ngneat/transloco"
import { Observable, from, map, of, switchMap } from "rxjs"
import { TranslocoConfigExt } from "src/transloco.config"
import { IEnv } from "../../../../electron/interfaces/env.interface"
import { ERoutes } from "../enums/routes.enum"
import { CMSService } from "../services/cms.service"
import { IMainPage } from "../interfaces/main-page.interface"
import { MainStore } from "../store/main.store"

@Injectable({
    providedIn: "root",
})
export class EnvResolver {
    constructor(
        private cms: CMSService,
        private mainStore: MainStore,
        private transloco: TranslocoService,
        private router: Router
    ) {}

    resolve(): Observable<boolean> {
        let env: IEnv
        return from(window.electronAPI.getEnv()).pipe(
            switchMap((e) => {
                env = e
                return e.FLAVOR === "ont" ? this.cms.getTerms() : of(null)
            }),
            map((page) => {
                this.resolveLang(env)
                const resolved = this.resolveTerms(env, page)
                if (resolved) {
                    return this.resolveClient(env)
                }
                return resolved
            })
        )
    }

    private resolveLang(env: IEnv) {
        const storedLanguage = env?.ACTIVE_LANGUAGE
        if (TranslocoConfigExt["availableLangs"].includes(storedLanguage)) {
            this.transloco.setActiveLang(storedLanguage!)
        }
    }

    private resolveTerms(env: IEnv, page?: IMainPage | null) {
        if (!page) {
            return true
        }
        if (env?.TERMS_ACCEPTED_VERSION !== page.version) {
            this.router.navigate(["/", ERoutes.TERMS_CONDITIONS])
            return false
        }
        return true
    }

    private resolveClient(env: IEnv) {
        if (!env?.X_NETTEST_CLIENT && env?.FLAVOR === "ont") {
            this.router.navigate(["/", ERoutes.CLIENT])
            return false
        }
        return true
    }
}
