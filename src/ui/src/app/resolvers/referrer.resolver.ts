import { Injectable } from "@angular/core"
import { Router } from "@angular/router"
import { Observable, of } from "rxjs"
import { MainStore } from "../store/main.store"

@Injectable({
    providedIn: "root",
})
export class ReferrerResolver {
    constructor(private mainStore: MainStore, private router: Router) {}

    resolve(): Observable<boolean> {
        this.mainStore.referrer$.next(this.router.url)
        return of(true)
    }
}
