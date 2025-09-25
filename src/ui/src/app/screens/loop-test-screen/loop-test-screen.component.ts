import { Component } from "@angular/core"
import { TestScreenComponent } from "../test-screen/test-screen.component"
import { ITestVisualizationState } from "src/app/interfaces/test-visualization-state.interface"
import { STATE_UPDATE_TIMEOUT } from "src/app/store/test.store"
import { ERROR_OCCURED_DURING_LOOP } from "src/app/constants/strings"
import {
    BehaviorSubject,
    distinctUntilChanged,
    filter,
    takeUntil,
    tap,
    withLatestFrom,
} from "rxjs"
import { EMeasurementStatus } from "../../../../../measurement/enums/measurement-status.enum"

@Component({
    selector: "app-loop-test-screen",
    templateUrl: "../test-screen/test-screen.component.html",
    styleUrls: ["../test-screen/test-screen.component.scss"],
    standalone: false,
})
export class LoopTestScreenComponent extends TestScreenComponent {
    private waitingProgressMs = 0
    private currentTestUuid$ = new BehaviorSubject<string | null>(null)

    protected get lastTestFinishedAt$() {
        return this.store.lastTestFinishedAt$
    }

    override visualization$ = this.store.visualization$.pipe(
        withLatestFrom(this.mainStore.error$, this.loopCount$),
        distinctUntilChanged(),
        tap(([state, error]) => {
            this.setShowCPUWarning(this.mainStore.env$.value)
            this.initNewLoop(state.phases[state.currentPhaseName].testUuid)
            if (error) {
                this.openErrorDialog(state)
            } else if (state.currentPhaseName === EMeasurementStatus.END) {
                this.goToResult(state)
            }
            this.setProgressIndicator(state)
        }),
    )

    override ngOnInit(): void {
        super.ngOnInit()
        this.lastTestFinishedAt$
            .pipe(
                filter((v) => v > 0),
                distinctUntilChanged(),
                takeUntil(this.stopped$),
            )
            .subscribe(() => {
                this.getRecentHistory(this.loopCount$.value)
            })
    }

    private initNewLoop(testUuid: string) {
        const lastTestUuid = this.currentTestUuid$.value
        if (lastTestUuid !== testUuid) {
            this.currentTestUuid$.next(testUuid)
            this.loopWaiting$.next(false)
            this.waitingProgressMs = 0
            this.estimatedEndTime.set(
                new Date(this.store.estimatedEndTime() as number),
            )
        }
    }

    protected override openErrorDialog(state: ITestVisualizationState) {
        this.goToResult(state)
    }

    protected override goToResult = (state: ITestVisualizationState) => {
        this.loopWaiting$.next(true)
        this.mainStore.error$.next(null)
    }

    private getRecentHistory(loopCount: number) {
        this.historyStore
            .getRecentMeasurementHistory({
                offset: 0,
                limit: loopCount,
            })
            .subscribe()
    }

    private setProgressIndicator(state: ITestVisualizationState) {
        if (!this.loopWaiting$.value) {
            return
        }
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
