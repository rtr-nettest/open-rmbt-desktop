import {
    ChangeDetectionStrategy,
    Component,
    OnDestroy,
    OnInit,
} from "@angular/core"
import { Router } from "@angular/router"
import {
    BehaviorSubject,
    Subject,
    distinctUntilChanged,
    takeUntil,
    tap,
    withLatestFrom,
} from "rxjs"
import { MainStore } from "src/app/store/main.store"
import { STATE_UPDATE_TIMEOUT, TestStore } from "src/app/store/test.store"
import { EMeasurementStatus } from "../../../../../measurement/enums/measurement-status.enum"
import { MessageService } from "src/app/services/message.service"
import {
    ERROR_OCCURED,
    ERROR_OCCURED_SENDING_RESULTS,
} from "src/app/constants/strings"
import { ITestVisualizationState } from "src/app/interfaces/test-visualization-state.interface"
import { HistoryStore } from "src/app/store/history.store"
import { IEnv } from "../../../../../electron/interfaces/env.interface"

@Component({
    selector: "app-test-screen",
    templateUrl: "./test-screen.component.html",
    styleUrls: ["./test-screen.component.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TestScreenComponent implements OnDestroy, OnInit {
    enableLoopMode$ = this.store.enableLoopMode$
    loopCount$ = this.store.loopCounter$
    env$ = this.mainStore.env$
    stopped$: Subject<void> = new Subject()
    visualization$ = this.store.visualization$.pipe(
        withLatestFrom(this.mainStore.error$, this.loopCount$),
        distinctUntilChanged(),
        tap(([state, error, loopCount]) => {
            this.setShowCPUWarning(this.mainStore.env$.value)
            if (error) {
                this.openErrorDialog(state)
            } else if (state.currentPhaseName === EMeasurementStatus.END) {
                this.goToResult(state)
            } else {
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
        })
    )
    loopWaiting$ = new BehaviorSubject(false)
    result$ = this.historyStore.getFormattedHistory({
        grouped: false,
        loopUuid: this.store.loopUuid$.value ?? undefined,
    })
    showCPUWarning$ = new BehaviorSubject(0)
    ms$ = new BehaviorSubject(0)
    progress$ = new BehaviorSubject(0)
    private waitingProgressMs = 0

    constructor(
        private historyStore: HistoryStore,
        private store: TestStore,
        private mainStore: MainStore,
        private router: Router,
        private message: MessageService
    ) {}

    ngOnInit(): void {
        this.store.launchTest().pipe(takeUntil(this.stopped$)).subscribe()
    }

    ngOnDestroy(): void {
        this.stopped$.next()
        this.stopped$.complete()
    }

    private openErrorDialog(state: ITestVisualizationState) {
        this.message.closeAllDialogs()
        const message =
            state.currentPhaseName === EMeasurementStatus.SUBMITTING_RESULTS
                ? ERROR_OCCURED_SENDING_RESULTS
                : ERROR_OCCURED
        if (this.enableLoopMode$.value !== true) {
            this.stopped$.next()
            this.message.openConfirmDialog(message, () => {
                this.mainStore.error$.next(null)
                state.currentPhaseName === EMeasurementStatus.SUBMITTING_RESULTS
                    ? this.goToResult(state)
                    : this.router.navigate(["/"])
            })
        } else {
            this.message.openConfirmDialog(message, () => void 0)
            this.goToResult(state)
        }
    }

    private setShowCPUWarning(env: IEnv | null) {
        if (env?.CPU_WARNING_PERCENT) {
            window.electronAPI.getCPUUsage().then((cpu) => {
                const cpuLoadMax = cpu && Math.round(cpu.load_max * 100)
                if (cpuLoadMax > env.CPU_WARNING_PERCENT!) {
                    this.showCPUWarning$.next(cpuLoadMax)
                } else {
                    this.showCPUWarning$.next(0)
                }
            })
        }
    }

    private goToResult = (state: ITestVisualizationState) => {
        if (this.enableLoopMode$.value !== true) {
            this.router.navigate([
                "result",
                state.phases[state.currentPhaseName].testUuid,
            ])
        } else {
            this.loopWaiting$.next(true)
            this.mainStore.error$.next(null)
            this.setProgressIndicator(state)
        }
    }

    private setProgressIndicator(state: ITestVisualizationState) {
        this.waitingProgressMs += STATE_UPDATE_TIMEOUT
        const timeTillEndMs =
            state.startTimeMs + this.store.fullTestIntervalMs - state.endTimeMs
        const currentMs = Math.max(0, timeTillEndMs - this.waitingProgressMs)
        this.ms$.next(currentMs)
        this.progress$.next((this.waitingProgressMs / timeTillEndMs) * 100)
    }
}
