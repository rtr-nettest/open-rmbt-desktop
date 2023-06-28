import { Injectable } from "@angular/core"
import { Router } from "@angular/router"
import { Observable, from, map } from "rxjs"
import { ERoutes } from "../enums/routes.enum"
import { MainStore } from "../store/main.store"

@Injectable({
    providedIn: "root",
})
export class TermsAcceptedResolver {
    constructor(private router: Router, private store: MainStore) {}

    resolve(): Observable<boolean> {
        return from(this.store.getEnv()).pipe(
            map((env) => {
                if (!env?.TERMS_ACCEPTED) {
                    this.router.navigate(["/", ERoutes.TERMS_CONDITIONS])
                    return false
                }
                return true
            })
        )
    }
}
