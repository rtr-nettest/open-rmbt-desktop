import { Component } from "@angular/core"
import { TestScreenComponent } from "../test-screen/test-screen.component"
import { ITestVisualizationState } from "src/app/interfaces/test-visualization-state.interface"
import { STATE_UPDATE_TIMEOUT } from "src/app/store/test.store"
import { ERROR_OCCURED_DURING_LOOP } from "src/app/constants/strings"
import { distinctUntilChanged, tap, withLatestFrom } from "rxjs"
import { EMeasurementStatus } from "../../../../../measurement/enums/measurement-status.enum"

@Component({
    selector: "app-loop-test-screen",
    templateUrl: "../test-screen/test-screen.component.html",
    styleUrls: ["../test-screen/test-screen.component.scss"],
})
export class LoopTestScreenComponent extends TestScreenComponent {
    private waitingProgressMs = 0

    override visualization$ = this.store.visualization$.pipe(
        withLatestFrom(this.mainStore.error$, this.loopCount$),
        distinctUntilChanged(),
        tap(([state, error, loopCount]) => {
            this.setShowCPUWarning(this.mainStore.env$.value)
            if (error) {
                this.openErrorDialog(state)
            } else if (state.currentPhaseName === EMeasurementStatus.END) {
                this.goToResult(state)
            } else {
                this.getRecentHistory(loopCount)
            }
        })
    )

    override ngOnInit(): void {
        super.ngOnInit()
        window.electronAPI.onAppResumed(() => {
            this.ngZone.run(() => {
                this.getRecentHistory(this.loopCount$.value)
            })
        })
    }

    protected override openErrorDialog(state: ITestVisualizationState) {
        this.message.closeAllDialogs()
        const message =
            this.transloco.translate(ERROR_OCCURED_DURING_LOOP) +
            " " +
            this.loopCount$.value
        this.message.openConfirmDialog(message, () => void 0)
        this.goToResult(state)
    }

    protected override goToResult = (state: ITestVisualizationState) => {
        this.loopWaiting$.next(true)
        this.mainStore.error$.next(null)
        this.setProgressIndicator(state)
    }

    private getRecentHistory(loopCount: number) {
        if (!!this.loopWaiting$.value) {
            this.historyStore
                .getRecentMeasurementHistory({
                    offset: 0,
                    limit: loopCount - 1,
                })
                .subscribe()
            this.waitingProgressMs = 0
        }
        this.loopWaiting$.next(false)
    }

    private setProgressIndicator(state: ITestVisualizationState) {
        this.waitingProgressMs += STATE_UPDATE_TIMEOUT
        const endTimeMs = Math.max(state.startTimeMs, state.endTimeMs)
        const timeTillEndMs =
            state.startTimeMs + this.store.fullTestIntervalMs - endTimeMs
        const currentMs = Math.max(0, timeTillEndMs - this.waitingProgressMs)
        if (currentMs <= 0 || currentMs > this.store.fullTestIntervalMs) {
            this.progressMode$.next("indeterminate")
        } else {
            this.progressMode$.next("determinate")
            this.ms$.next(currentMs)
            this.progress$.next((this.waitingProgressMs / timeTillEndMs) * 100)
        }
    }
}
