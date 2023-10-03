import { Injectable } from "@angular/core"
import { Router } from "@angular/router"
import { Observable, of } from "rxjs"
import { TestStore } from "../store/test.store"

@Injectable({
    providedIn: "root",
})
export class MeasurementResolver {
    constructor(private store: TestStore) {}

    resolve(): Observable<boolean> {
        window.electronAPI.abortMeasurement()
        this.store.disableLoopMode()
        return of(true)
    }
}
