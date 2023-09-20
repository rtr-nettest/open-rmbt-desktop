import { Component } from "@angular/core"
import { Router } from "@angular/router"
import { TestStore } from "src/app/store/test.store"

@Component({
    selector: "app-stop-loop-button",
    templateUrl: "./stop-loop-button.component.html",
    styleUrls: ["./stop-loop-button.component.scss"],
})
export class StopLoopButtonComponent {
    constructor(private testStore: TestStore, private router: Router) {}

    abortTest() {
        window.electronAPI.abortMeasurement()
        this.testStore.disableLoopMode()
        this.router.navigate(["/"])
    }
}
