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
                return this.resolveTerms(env)
            })
        )
    }

    private resolveLang(env: IEnv) {
        const storedLanguage = env?.LANGUAGE
        if (TranslocoConfigExt["availableLangs"].includes(storedLanguage)) {
            this.transloco.setActiveLang(storedLanguage!)
        }
    }

    private resolveTerms(env: IEnv) {
        if (!env?.TERMS_ACCEPTED) {
            this.router.navigate(["/", ERoutes.TERMS_CONDITIONS])
            return false
        }
        return true
    }
}
