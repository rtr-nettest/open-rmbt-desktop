import { ChangeDetectionStrategy, Component } from "@angular/core"
import { MainStore } from "src/app/store/main.store"

@Component({
    selector: "app-start-test-button",
    templateUrl: "./start-test-button.component.html",
    styleUrls: ["./start-test-button.component.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StartTestButtonComponent {
    env$ = this.mainStore.env$

    constructor(private mainStore: MainStore) {}
}
