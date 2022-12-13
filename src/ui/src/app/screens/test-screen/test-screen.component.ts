import { Component } from "@angular/core"
import { Router } from "@angular/router"
import { tap } from "rxjs"
import { TestStore } from "src/app/store/test.store"
import { EMeasurementStatus } from "../../../../../measurement/enums/measurement-status.enum"

@Component({
    selector: "app-test-screen",
    templateUrl: "./test-screen.component.html",
    styleUrls: ["./test-screen.component.scss"],
})
export class TestScreenComponent {
    visualization$ = this.testStore.launchTest().pipe(
        tap((state) => {
            if (state.currentPhase === EMeasurementStatus.END) {
                this.router.navigate(["/"])
            }
        })
    )

    constructor(private testStore: TestStore, private router: Router) {}
}
