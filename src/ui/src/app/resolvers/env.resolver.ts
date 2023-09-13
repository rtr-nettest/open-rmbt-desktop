import { Injectable } from "@angular/core"
import { Router } from "@angular/router"
import { TranslocoService } from "@ngneat/transloco"
import { Observable, from, map } from "rxjs"
import { TranslocoConfigExt } from "src/transloco.config"
import { IEnv } from "../../../../electron/interfaces/env.interface"
import { ERoutes } from "../enums/routes.enum"

@Injectable({
    providedIn: "root",
})
export class EnvResolver {
    constructor(private transloco: TranslocoService, private router: Router) {}

    resolve(): Observable<boolean> {
        return from(window.electronAPI.getEnv()).pipe(
            map((env) => {
                this.resolveLang(env)
                const termsAccepted = this.resolveTerms(env)
                if (termsAccepted) {
                    return this.resolveClient(env)
                }
                return termsAccepted
            })
        )
    }

    private resolveLang(env: IEnv) {
        const storedLanguage = env?.ACTIVE_LANGUAGE
        if (TranslocoConfigExt["availableLangs"].includes(storedLanguage)) {
            this.transloco.setActiveLang(storedLanguage!)
        }
    }

    private resolveTerms(env: IEnv) {
        if (!env?.TERMS_ACCEPTED && env?.FLAVOR !== "ont") {
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
