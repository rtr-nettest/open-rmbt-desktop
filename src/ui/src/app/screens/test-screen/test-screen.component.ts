import { ChangeDetectionStrategy, Component } from "@angular/core"
import { Router } from "@angular/router"
import { tap, withLatestFrom } from "rxjs"
import { MainStore } from "src/app/store/main.store"
import { TestStore } from "src/app/store/test.store"
import { EMeasurementStatus } from "../../../../../measurement/enums/measurement-status.enum"
import { MessageService } from "src/app/services/message.service"
import {
    ERROR_OCCURED_DURING_MEASUREMENT,
    ERROR_OCCURED_SENDING_RESULTS,
} from "src/app/constants/strings"

@Component({
    selector: "app-test-screen",
    templateUrl: "./test-screen.component.html",
    styleUrls: ["./test-screen.component.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TestScreenComponent {
    env$ = this.mainStore.env$
    visualization$ = this.store.launchTest().pipe(
        withLatestFrom(this.mainStore.error$),
        tap(([state, error]) => {
            const goToResult = () =>
                this.router.navigate([
                    "result",
                    state.phases[state.currentPhaseName].testUuid,
                ])
            if (
                error &&
                state.currentPhaseName !== EMeasurementStatus.SUBMITTING_RESULTS
            ) {
                this.message.openConfirmDialog(
                    ERROR_OCCURED_DURING_MEASUREMENT,
                    () => {
                        this.mainStore.error$.next(null)
                        this.router.navigate(["/"])
                    }
                )
            } else if (
                error &&
                state.currentPhaseName === EMeasurementStatus.SUBMITTING_RESULTS
            ) {
                this.message.openConfirmDialog(
                    ERROR_OCCURED_SENDING_RESULTS,
                    () => {
                        this.mainStore.error$.next(null)
                        goToResult()
                    }
                )
            } else if (state.currentPhaseName === EMeasurementStatus.END) {
                goToResult()
            }
        })
    )

    constructor(
        private store: TestStore,
        private mainStore: MainStore,
        private router: Router,
        private message: MessageService
    ) {}
}
