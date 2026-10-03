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
        // When the loop expires, end the waiting countdown/animation and stop
        // polling — there is no next test. (The expiry dialog then navigates to
        // the result overview on confirm.)
        this.store.loopModeExpired$
            .pipe(takeUntil(this.stopped$))
            .subscribe(() => {
                this.loopWaiting$.next(false)
                this.progressMode$.next("determinate")
                this.stopped$.next()
            })
    }

    private initNewLoop(testUuid: string) {
        const lastTestUuid = this.currentTestUuid$.value
        if (lastTestUuid !== testUuid) {
            this.currentTestUuid$.next(testUuid)
            this.loopWaiting$.next(false)
            this.waitingProgressMs = 0
            // Reset the wait bar so the next waiting period starts from 0 again.
            this.progress$.next(0)
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

    // The wait bar may advance at most this fast, so a short (or zero) interval
    // can't make it race or flicker.
    private static readonly MAX_PROGRESS_PER_SECOND = 5

    private setProgressIndicator(state: ITestVisualizationState) {
        if (!this.loopWaiting$.value) {
            return
        }
        this.waitingProgressMs += STATE_UPDATE_TIMEOUT
        const endTimeMs = Math.max(state.startTimeMs, state.endTimeMs)
        const timeTillEndMs =
            state.startTimeMs + this.store.fullTestIntervalMs - endTimeMs

        // "Next measurement in mm:ss" countdown (0 once the interval has already
        // elapsed during the test).
        this.ms$.next(Math.max(0, timeTillEndMs - this.waitingProgressMs))

        // Determinate bar only: it always starts at 0, advances no faster than
        // MAX_PROGRESS_PER_SECOND, is capped at 100% and never moves backwards —
        // so when the interval is short/zero it fills slowly and then holds
        // instead of restarting (which looked like flickering).
        this.progressMode$.next("determinate")
        const elapsedSeconds = this.waitingProgressMs / 1000
        const rateCapped =
            elapsedSeconds * LoopTestScreenComponent.MAX_PROGRESS_PER_SECOND
        const natural =
            timeTillEndMs > 0
                ? (this.waitingProgressMs / timeTillEndMs) * 100
                : 100
        const next = Math.min(100, rateCapped, natural)
        this.progress$.next(Math.max(this.progress$.value, next))
    }
}
