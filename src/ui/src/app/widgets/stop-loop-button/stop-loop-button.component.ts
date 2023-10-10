import { Component } from "@angular/core"
import { Router } from "@angular/router"
import { ERoutes } from "src/app/enums/routes.enum"
import { TestStore } from "src/app/store/test.store"

@Component({
    selector: "app-stop-loop-button",
    templateUrl: "./stop-loop-button.component.html",
    styleUrls: ["./stop-loop-button.component.scss"],
})
export class StopLoopButtonComponent {
    constructor(private testStore: TestStore, private router: Router) {}

    abortTest() {
        this.router.navigate([
            "/",
            ERoutes.LOOP_RESULT.split("/")[0],
            this.testStore.loopUuid$.value,
        ])
    }
}
