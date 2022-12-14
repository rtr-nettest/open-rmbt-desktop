import { Component } from "@angular/core"
import { Router } from "@angular/router"
import { of, switchMap, tap } from "rxjs"
import { TestStore } from "src/app/store/test.store"
import { EMeasurementStatus } from "../../../../../measurement/enums/measurement-status.enum"

@Component({
    selector: "app-test-screen",
    templateUrl: "./test-screen.component.html",
    styleUrls: ["./test-screen.component.scss"],
})
export class TestScreenComponent {
    visualization$ = this.store.launchTest().pipe(
        tap((state) => {
            if (state.currentPhase === EMeasurementStatus.END) {
                this.router.navigate([
                    "result",
                    state.phases[state.currentPhase].testUuid,
                ])
            }
        })
    )

    constructor(private store: TestStore, private router: Router) {}
}
