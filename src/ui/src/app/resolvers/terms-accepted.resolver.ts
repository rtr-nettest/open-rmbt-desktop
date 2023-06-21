import { Injectable } from "@angular/core"
import { Router } from "@angular/router"
import { Observable, from, map } from "rxjs"
import { ERoutes } from "../enums/routes.enum"
import { TranslocoService } from "@ngneat/transloco"

@Injectable({
    providedIn: "root",
})
export class TermsAcceptedResolver {
    constructor(private router: Router, private transloco: TranslocoService) {}

    resolve(): Observable<boolean> {
        return from(window.electronAPI.getTermsAccepted()).pipe(
            map((accepted) => {
                if (!accepted) {
                    this.router.navigate(["/", ERoutes.TERMS_CONDITIONS])
                }
                return !!accepted
            })
        )
    }
}
