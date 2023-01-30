import { ChangeDetectionStrategy, Component, OnDestroy } from "@angular/core"
import { fromEvent } from "rxjs"
import { debounceTime, tap } from "rxjs/operators"
import { ITestVisualizationState } from "src/app/interfaces/test-visualization-state.interface"
import { PlatformService } from "src/app/services/platform.service"
import { TestStore } from "src/app/store/test.store"
import { EMeasurementStatus } from "../../../../../measurement/enums/measurement-status.enum"

interface ITestStage {
    title: string
    stage: EMeasurementStatus
    progress: (state: ITestVisualizationState | null) => number
}

@Component({
    selector: "nt-test-header",
    templateUrl: "./test-header.component.html",
    styleUrls: ["./test-header.component.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TestHeaderComponent implements OnDestroy {
    currentStage?: EMeasurementStatus

    progress$ = this.store.visualization$.pipe(
        tap((s) => {
            const stages = this.stages.map((stage) => stage.stage)
            if (stages.includes(s.currentPhaseName)) {
                this.currentStage = s.currentPhaseName
            }
        })
    )

    stages: ITestStage[] = []

    desktopStages: ITestStage[] = [
        {
            title: "test.header_initialising",
            stage: EMeasurementStatus.INIT,
            progress: (s) =>
                (s?.phases[EMeasurementStatus.INIT].progress ?? 0) * 100,
        },
        {
            title: "test.header_down_pre_test",
            stage: EMeasurementStatus.INIT_DOWN,
            progress: (s) =>
                (s?.phases[EMeasurementStatus.INIT_DOWN].progress ?? 0) * 100,
        },
        {
            title: "test.header_latency",
            stage: EMeasurementStatus.PING,
            progress: (s) =>
                (s?.phases[EMeasurementStatus.PING].progress ?? 0) * 100,
        },
        {
            title: "test.header_download",
            stage: EMeasurementStatus.DOWN,
            progress: (s) =>
                (s?.phases[EMeasurementStatus.DOWN].progress ?? 0) * 100,
        },
        {
            title: "test.header_up_pre_test",
            stage: EMeasurementStatus.INIT_UP,
            progress: (s) =>
                (s?.phases[EMeasurementStatus.INIT_UP].progress ?? 0) * 100,
        },
        {
            title: "test.header_upload",
            stage: EMeasurementStatus.UP,
            progress: (s) =>
                (s?.phases[EMeasurementStatus.UP].progress ?? 0) * 100,
        },
        {
            title: "test.header_finalisation",
            stage: EMeasurementStatus.SUBMITTING_RESULTS,
            progress: (s) =>
                (s?.phases[EMeasurementStatus.SUBMITTING_RESULTS].progress ??
                    0) * 100,
        },
    ]

    private mobileStages = [
        ...this.desktopStages,
        {
            title: "test.header_result",
            stage: EMeasurementStatus.END,
            progress: () => 0,
        },
    ]

    private resizeSub = fromEvent(globalThis, "resize")
        .pipe(
            debounceTime(150),
            tap(() => this.setStages())
        )
        .subscribe()

    get isMobile() {
        return this.platform.isMobile || this.platform.isSmallMobile
    }

    get totalStages() {
        return this.isMobile ? this.stages.length - 1 : this.stages.length
    }

    constructor(private platform: PlatformService, private store: TestStore) {
        this.setStages()
    }

    ngOnDestroy(): void {
        this.resizeSub.unsubscribe()
    }

    isStageVisible(stage: ITestStage): boolean {
        return !this.isMobile || stage.stage === this.currentStage
    }

    setStages() {
        if (this.isMobile) {
            this.stages = this.mobileStages
        } else {
            this.stages = this.desktopStages
        }
    }

    shouldShowPhaseCounter(index: number) {
        return this.isMobile && index <= this.totalStages
    }

    stageTitle(_: any, stage: ITestStage) {
        return stage.title
    }
}
