import { ChangeDetectionStrategy, Component } from "@angular/core"
import { lastValueFrom, map } from "rxjs"
import { MainStore } from "src/app/store/main.store"
import { TestStore } from "src/app/store/test.store"

@Component({
    selector: "app-start-test-button",
    templateUrl: "./start-test-button.component.html",
    styleUrls: ["./start-test-button.component.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StartTestButtonComponent {
    env$ = this.mainStore.env$
    disabled$ = this.mainStore.settings$.pipe(
        map((settings) => !settings?.uuid)
    )

    constructor(private mainStore: MainStore, private testStore: TestStore) {}

    async preventNavigation(e: Event) {
        if ((await lastValueFrom(this.disabled$)) === true) {
            e.preventDefault()
        }
    }
}
