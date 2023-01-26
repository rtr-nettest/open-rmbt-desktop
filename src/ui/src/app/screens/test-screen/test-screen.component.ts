import { Component } from "@angular/core"
import { Router } from "@angular/router"
import { tap, withLatestFrom } from "rxjs"
import { MainStore } from "src/app/store/main.store"
import { TestStore } from "src/app/store/test.store"
import { EMeasurementStatus } from "../../../../../measurement/enums/measurement-status.enum"

@Component({
    selector: "app-test-screen",
    templateUrl: "./test-screen.component.html",
    styleUrls: ["./test-screen.component.scss"],
})
export class TestScreenComponent {
    env$ = this.mainStore.env$
    visualization$ = this.store.launchTest().pipe(
        withLatestFrom(this.store.error$),
        tap(([state, error]) => {
            if (state.currentPhaseName === EMeasurementStatus.END || error) {
                this.goToResultScreen(
                    state.phases[state.currentPhaseName].testUuid
                )
            }
        })
    )

    constructor(
        private store: TestStore,
        private mainStore: MainStore,
        private router: Router
    ) {}

    private goToResultScreen(testUuid: string) {
        this.router.navigate(["result", testUuid])
    }
}
