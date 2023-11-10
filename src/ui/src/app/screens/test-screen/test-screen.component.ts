import {
    ChangeDetectionStrategy,
    Component,
    OnDestroy,
    OnInit,
} from "@angular/core"
import { Router } from "@angular/router"
import {
    BehaviorSubject,
    Observable,
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
    visualization$ = this.store.launchTest().pipe(
        withLatestFrom(this.mainStore.error$),
        distinctUntilChanged(),
        takeUntil(this.stopped$),
        tap(([state, error]) => {
            this.setShowCPUWarning(this.mainStore.env$.value)
            if (!this.startTimeMs) {
                this.startTimeMs = Date.now()
                this.loopWaiting$.next(false)
            }
            if (error) {
                this.openErrorDialog(state)
            } else if (state.currentPhaseName === EMeasurementStatus.END) {
                this.stopped$.next()
                this.goToResult(state)
            } else if (state.currentPhaseName === EMeasurementStatus.INIT) {
                this.message.closeAllDialogs()
            }
        })
    )
    loopWaitProgress$?: Observable<{ ms: number; percent: number }>
    loopWaiting$ = new BehaviorSubject(false)
    result$ = this.historyStore.getFormattedHistory({
        grouped: false,
        loopUuid: this.store.loopUuid$.value ?? undefined,
    })
    showCPUWarning$ = new BehaviorSubject(0)
    private startTimeMs = 0

    constructor(
        private historyStore: HistoryStore,
        private store: TestStore,
        private mainStore: MainStore,
        private router: Router,
        private message: MessageService
    ) {}

    ngOnInit(): void {
        this.historyStore
            .getRecentMeasurementHistory({
                offset: 0,
                limit: this.store.loopCounter$.value - 1,
            })
            .subscribe()
    }

    ngOnDestroy(): void {
        this.stopped$.complete()
    }

    private openErrorDialog(state: ITestVisualizationState) {
        this.stopped$.next()
        const message =
            state.currentPhaseName === EMeasurementStatus.SUBMITTING_RESULTS
                ? ERROR_OCCURED_SENDING_RESULTS
                : ERROR_OCCURED
        if (this.enableLoopMode$.value === true) {
            this.message.openConfirmDialog(message, () => void 0)
            this.goToResult(state)
        } else {
            this.message.openConfirmDialog(message, () => {
                this.mainStore.error$.next(null)
                state.currentPhaseName === EMeasurementStatus.SUBMITTING_RESULTS
                    ? this.goToResult(state)
                    : this.router.navigate(["/"])
            })
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
            this.loopWaitProgress$ = this.store.setProgressIndicator(
                Date.now() - this.startTimeMs
            )
            this.mainStore.error$.next(null)
        }
        this.startTimeMs = 0
    }
}
