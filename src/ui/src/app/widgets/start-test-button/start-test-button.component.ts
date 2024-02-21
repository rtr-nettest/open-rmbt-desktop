import { ChangeDetectionStrategy, Component } from "@angular/core"
import { lastValueFrom, map, withLatestFrom } from "rxjs"
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
        withLatestFrom(this.mainStore.isOnline$),
        map(([settings, isOnline]) => !settings?.uuid || !isOnline)
    )

    constructor(private mainStore: MainStore) {}

    async preventNavigation(e: Event) {
        if ((await lastValueFrom(this.disabled$)) === true) {
            e.preventDefault()
        }
    }
}
