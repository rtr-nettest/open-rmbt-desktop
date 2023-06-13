import { ChangeDetectionStrategy, Component, OnDestroy } from "@angular/core"
import { Router } from "@angular/router"
import {
    Subject,
    distinctUntilChanged,
    takeUntil,
    tap,
    withLatestFrom,
} from "rxjs"
import { MainStore } from "src/app/store/main.store"
import { TestStore } from "src/app/store/test.store"
import { EMeasurementStatus } from "../../../../../measurement/enums/measurement-status.enum"
import { MessageService } from "src/app/services/message.service"
import {
    ERROR_OCCURED_DURING_MEASUREMENT,
    ERROR_OCCURED_SENDING_RESULTS,
} from "src/app/constants/strings"
import { ITestVisualizationState } from "src/app/interfaces/test-visualization-state.interface"

@Component({
    selector: "app-test-screen",
    templateUrl: "./test-screen.component.html",
    styleUrls: ["./test-screen.component.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TestScreenComponent implements OnDestroy {
    env$ = this.mainStore.env$
    stopped$: Subject<void> = new Subject()
    visualization$ = this.store.launchTest().pipe(
        withLatestFrom(this.mainStore.error$),
        distinctUntilChanged(),
        takeUntil(this.stopped$),
        tap(([state, error]) => {
            if (error) {
                this.stopped$.next()
                const message =
                    state.currentPhaseName ===
                    EMeasurementStatus.SUBMITTING_RESULTS
                        ? ERROR_OCCURED_SENDING_RESULTS
                        : ERROR_OCCURED_DURING_MEASUREMENT
                const navigate = () =>
                    state.currentPhaseName ===
                    EMeasurementStatus.SUBMITTING_RESULTS
                        ? this.goToResult(state)
                        : this.router.navigate(["/"])
                this.message.openConfirmDialog(message, () => {
                    this.mainStore.error$.next(null)
                    navigate()
                })
            } else if (state.currentPhaseName === EMeasurementStatus.END) {
                this.stopped$.next()
                this.goToResult(state)
            }
        })
    )

    constructor(
        private store: TestStore,
        private mainStore: MainStore,
        private router: Router,
        private message: MessageService
    ) {}

    ngOnDestroy(): void {
        this.stopped$.complete()
    }

    private goToResult = (state: ITestVisualizationState) =>
        this.router.navigate([
            "result",
            state.phases[state.currentPhaseName].testUuid,
        ])
}
