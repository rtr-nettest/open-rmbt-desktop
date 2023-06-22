import { Injectable } from "@angular/core"
import { Router } from "@angular/router"
import { Observable, forkJoin, from, map } from "rxjs"
import { ERoutes } from "../enums/routes.enum"
import { MainStore } from "../store/main.store"

@Injectable({
    providedIn: "root",
})
export class TermsAcceptedResolver {
    constructor(private router: Router, private store: MainStore) {}

    resolve(): Observable<boolean> {
        return forkJoin([
            from(window.electronAPI.getTermsAccepted()),
            from(window.electronAPI.getNews()),
        ]).pipe(
            map(([accepted, news]) => {
                if (!accepted) {
                    this.router.navigate(["/", ERoutes.TERMS_CONDITIONS])
                    return false
                }
                if (news?.length) {
                    this.store.news$.next(news)
                    this.router.navigate(["/", ERoutes.NEWS])
                    return false
                }
                return true
            })
        )
    }
}
