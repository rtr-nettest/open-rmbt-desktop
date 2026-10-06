import { Component, ChangeDetectionStrategy } from "@angular/core"
import { Router } from "@angular/router"
import { ERoutes } from "src/app/enums/routes.enum"
import { TestStore } from "src/app/store/test.store"

@Component({
    selector: "app-stop-loop-button",
    templateUrl: "./stop-loop-button.component.html",
    styleUrls: ["./stop-loop-button.component.scss"],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false,
})
export class StopLoopButtonComponent {
    constructor(
        private testStore: TestStore,
        private router: Router,
    ) {}

    abortTest() {
        const loopUuid = this.testStore.loopUuid$.value
        const hasResults = this.testStore.loopHasResults()
        // DEBUG (renderer DevTools console): shows why navigation goes where it
        // does — in particular whether loopUuid is populated.
        console.log(
            "[abortTest] loopUuid =",
            loopUuid,
            "hasResults =",
            hasResults,
        )
        // End the loop for good: stop the running test AND the loop scheduler in
        // the main process (ABORT_MEASUREMENT does both), and disable loop mode so
        // nothing re-schedules.
        window.electronAPI.abortMeasurement()
        this.testStore.disableLoopMode()
        if (hasResults && loopUuid) {
            // Earlier measurements produced results → show the loop results.
            this.router.navigate([
                "/",
                ERoutes.LOOP_RESULT.split("/")[0],
                loopUuid,
            ])
        } else {
            // Nothing measured yet (first test) → go to the app start screen.
            // (Never navigate to loop-result with a null loopUuid — that throws
            // NG04008 and leaves the loop screen up.)
            this.router.navigate(["/"])
        }
    }
}
