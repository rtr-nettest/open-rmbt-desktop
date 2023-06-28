import { Injectable } from "@angular/core"
import { Router } from "@angular/router"
import { Observable, from, map } from "rxjs"
import { ERoutes } from "../enums/routes.enum"
import { MainStore } from "../store/main.store"
import { TranslocoService } from "@ngneat/transloco"
import { TranslocoConfigExt } from "src/transloco.config"

@Injectable({
    providedIn: "root",
})
export class TermsAcceptedResolver {
    constructor(
        private router: Router,
        private store: MainStore,
        private transloco: TranslocoService
    ) {}

    resolve(): Observable<boolean> {
        return from(this.store.getEnv()).pipe(
            map((env) => {
                const storedLanguage = env?.LANGUAGE
                if (
                    TranslocoConfigExt["availableLangs"].includes(
                        storedLanguage
                    )
                ) {
                    this.transloco.setActiveLang(storedLanguage!)
                }
                if (!env?.TERMS_ACCEPTED) {
                    this.router.navigate(["/", ERoutes.TERMS_CONDITIONS])
                    return false
                }
                return true
            })
        )
    }
}
