import {
    ChangeDetectionStrategy,
    Component,
    Input,
    NgZone,
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
    ERROR_OCCURED_DURING_LOOP,
    ERROR_OCCURED_SENDING_RESULTS,
} from "src/app/constants/strings"
import { ITestVisualizationState } from "src/app/interfaces/test-visualization-state.interface"
import { HistoryStore } from "src/app/store/history.store"
import { IEnv } from "../../../../../electron/interfaces/env.interface"
import { TranslocoService } from "@ngneat/transloco"

@Component({
    selector: "app-test-screen",
    templateUrl: "./test-screen.component.html",
    styleUrls: ["./test-screen.component.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TestScreenComponent implements OnDestroy, OnInit {
    @Input() hideMenu = false
    enableLoopMode$ = this.store.enableLoopMode$
    loopCount$ = this.store.loopCounter$
    env$ = this.mainStore.env$
    stopped$: Subject<void> = new Subject()
    visualization$ = this.store.visualization$.pipe(
        withLatestFrom(this.mainStore.error$, this.loopCount$),
        distinctUntilChanged(),
        tap(([state, error]) => {
            this.setShowCPUWarning(this.mainStore.env$.value)
            if (error) {
                this.openErrorDialog(state)
            } else if (state.currentPhaseName === EMeasurementStatus.END) {
                this.goToResult(state)
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
    progressMode$ = new BehaviorSubject<"determinate" | "indeterminate">(
        "determinate"
    )

    constructor(
        protected historyStore: HistoryStore,
        protected store: TestStore,
        protected mainStore: MainStore,
        protected ngZone: NgZone,
        protected router: Router,
        protected message: MessageService,
        protected transloco: TranslocoService
    ) {}

    ngOnInit(): void {
        this.store.launchTest().pipe(takeUntil(this.stopped$)).subscribe()
    }

    ngOnDestroy(): void {
        this.stopped$.next()
        this.stopped$.complete()
    }

    protected openErrorDialog(state: ITestVisualizationState) {
        this.message.closeAllDialogs()
        let message = ERROR_OCCURED
        if (state.currentPhaseName === EMeasurementStatus.SUBMITTING_RESULTS) {
            message = ERROR_OCCURED_SENDING_RESULTS
        }
        this.stopped$.next()
        this.message.openConfirmDialog(message, () => {
            this.mainStore.error$.next(null)
            state.currentPhaseName === EMeasurementStatus.SUBMITTING_RESULTS
                ? this.goToResult(state)
                : this.router.navigate(["/"])
        })
    }

    protected setShowCPUWarning(env: IEnv | null) {
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

    protected goToResult = (state: ITestVisualizationState) => {
        this.router.navigate([
            "result",
            state.phases[state.currentPhaseName].testUuid,
        ])
    }
}
