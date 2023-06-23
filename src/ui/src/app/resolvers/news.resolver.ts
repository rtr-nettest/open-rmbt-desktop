import { Injectable } from "@angular/core"
import { Router } from "@angular/router"
import { Observable, from, map } from "rxjs"
import { MainStore } from "../store/main.store"
import { ERoutes } from "../enums/routes.enum"

@Injectable({
    providedIn: "root",
})
export class NewsResolver {
    constructor(private router: Router, private store: MainStore) {}

    resolve(): Observable<boolean> {
        return from(window.electronAPI.getNews()).pipe(
            map((news) => {
                if (news?.length && !this.store.news$.value?.length) {
                    this.store.news$.next(news)
                    this.router.navigate(["/", ERoutes.NEWS])
                    return false
                }
                return true
            })
        )
    }
}
