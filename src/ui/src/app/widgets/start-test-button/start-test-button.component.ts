import { Component } from "@angular/core"
import { CoreStore } from "src/app/store/core.store"

@Component({
    selector: "app-start-test-button",
    templateUrl: "./start-test-button.component.html",
    styleUrls: ["./start-test-button.component.scss"],
})
export class StartTestButtonComponent {
    env$ = this.coreStore.env$

    constructor(private coreStore: CoreStore) {}
}
