import { Injectable } from "@angular/core"
import { Router } from "@angular/router"
import { Observable, from, map, withLatestFrom } from "rxjs"
import { ERoutes } from "../enums/routes.enum"
import { TranslocoService } from "@ngneat/transloco"
import { TRANSLATIONS_UPDATED_AT } from "../constants/strings"

@Injectable({
    providedIn: "root",
})
export class TermsAcceptedResolver {
    constructor(private router: Router, private transloco: TranslocoService) {}

    resolve(): Observable<boolean> {
        return from(window.electronAPI.getTermsAccepted()).pipe(
            withLatestFrom(
                this.transloco.selectTranslate(TRANSLATIONS_UPDATED_AT)
            ),
            map(([termsAcceptedAt, translationsUpdatedAt]) => {
                if (
                    !termsAcceptedAt ||
                    (translationsUpdatedAt &&
                        translationsUpdatedAt > termsAcceptedAt)
                ) {
                    this.router.navigate(["/", ERoutes.TERMS_CONDITIONS])
                }
                return true
            })
        )
    }
}
