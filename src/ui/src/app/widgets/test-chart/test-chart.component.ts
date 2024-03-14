import {
    Component,
    Input,
    NgZone,
    ChangeDetectionStrategy,
    OnInit,
    OnDestroy,
} from "@angular/core"
import { Observable } from "rxjs"
import { ITestVisualizationState } from "../../interfaces/test-visualization-state.interface"
import { withLatestFrom, map } from "rxjs/operators"
import { TranslocoService } from "@ngneat/transloco"
import { TestStore } from "src/app/store/test.store"
import { EMeasurementStatus } from "../../../../../measurement/enums/measurement-status.enum"
import { TestChart } from "../../dto/test-chart.dto"
import { MainStore } from "src/app/store/main.store"
import { TestLogChart } from "src/app/dto/test-log-chart.dto"
import { ChartPhase } from "src/app/dto/test-rtr-chart-dataset.dto"
import { TestBarChart } from "src/app/dto/test-bar-chart.dto"
import { TestPhaseState } from "src/app/dto/test-phase-state.dto"

@Component({
    selector: "app-test-chart",
    templateUrl: "./test-chart.component.html",
    styleUrls: ["./test-chart.component.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TestChartComponent implements OnInit, OnDestroy {
    @Input() phase: ChartPhase = "download"
    @Input() type: "line" | "bar" = "line"

    chart: TestChart | undefined
    visualization$: Observable<ITestVisualizationState> =
        this.store.visualization$.pipe(
            withLatestFrom(this.mainStore.env$),
            map(([s, env]) => {
                this.flavor = env?.FLAVOR || "rtr"
                if (this.canvas) {
                    this.handleChanges(s)
                }
                return s
            })
        )
    flavor?: string

    get canvas() {
        return document.getElementById(this.id) as HTMLCanvasElement
    }

    get id() {
        return `${this.phase}_chart`
    }

    private get blankCanvas() {
        return document.getElementById(this.id + "_blank") as HTMLCanvasElement
    }

    private get isCanvasEmpty() {
        return this.canvas?.toDataURL() === this.blankCanvas?.toDataURL()
    }

    constructor(
        private mainStore: MainStore,
        private ngZone: NgZone,
        private store: TestStore,
        private transloco: TranslocoService
    ) {}

    ngOnDestroy(): void {
        window.removeEventListener("focus", this.setChartOnFocus)
    }

    ngOnInit(): void {
        window.addEventListener("focus", this.setChartOnFocus)
    }

    private setChartOnFocus = () => {
        if (
            this.flavor === "ont" ||
            this.store.visualization$.value.currentPhaseName ===
                EMeasurementStatus.SHOWING_RESULTS
        ) {
            return
        }
        window.electronAPI.getMeasurementState().then((state) => {
            this.initChart()
            const phaseTestState = new TestPhaseState()
            if (this.phase === "ping") {
                phaseTestState.setChartFromPings(state.pings)
            } else {
                const phaseResultsKey =
                    this.phase === "download" ? "downs" : "ups"
                if (this.flavor === "ont") {
                    phaseTestState.setONTChartFromOverallSpeed(
                        state[phaseResultsKey]
                    )
                } else {
                    phaseTestState.setRTRChartFromOverallSpeed(
                        state[phaseResultsKey]
                    )
                }
            }
            try {
                this.chart?.setData(phaseTestState)
            } catch (_) {}
        })
    }

    private handleChanges(visualization: ITestVisualizationState) {
        this.ngZone.runOutsideAngular(async () => {
            this.initChart()
            try {
                switch (visualization.currentPhaseName) {
                    case EMeasurementStatus.INIT:
                    case EMeasurementStatus.INIT_DOWN:
                    case EMeasurementStatus.PING:
                    case EMeasurementStatus.NOT_STARTED:
                        this.chart?.resetData()
                        break
                    case EMeasurementStatus.DOWN:
                        this.updateDownload(visualization)
                        break
                    case EMeasurementStatus.UP:
                        this.updateUpload(visualization)
                        break
                    case EMeasurementStatus.SHOWING_RESULTS:
                        this.initChart({ force: true })
                        this.showResults(visualization)
                        break
                    case EMeasurementStatus.END:
                        this.showResults(visualization)
                        break
                }
            } catch (_) {}
        })
    }

    private showResults(visualization: ITestVisualizationState) {
        if (!!this.chart?.finished) {
            return
        }
        if (this.phase === "download") {
            this.chart?.setData(visualization.phases[EMeasurementStatus.DOWN])
        } else if (this.phase === "upload") {
            this.chart?.setData(visualization.phases[EMeasurementStatus.UP])
        } else if (this.phase === "ping") {
            this.chart?.setData(visualization.phases[EMeasurementStatus.PING])
        }
    }

    private updateDownload(visualization: ITestVisualizationState) {
        if (this.phase === "download") {
            this.chart?.updateData(
                visualization.phases[EMeasurementStatus.DOWN]
            )
        } else if (this.phase === "ping" && !this.chart?.finished) {
            this.chart?.setData(visualization.phases[EMeasurementStatus.PING])
        } else if (this.phase === "upload") {
            this.chart?.resetData()
        }
    }

    private updateUpload(visualization: ITestVisualizationState) {
        if (this.phase === "upload") {
            this.chart?.updateData(visualization.phases[EMeasurementStatus.UP])
        } else if (this.phase === "download" && !this.chart?.finished) {
            this.chart?.setData(visualization.phases[EMeasurementStatus.DOWN])
        } else if (this.phase === "ping" && !this.chart?.finished) {
            this.chart?.setData(visualization.phases[EMeasurementStatus.PING])
        }
    }

    private initChart(options?: { force: boolean }) {
        const ctx = this.canvas?.getContext("2d")
        if (ctx && (options?.force || this.isCanvasEmpty)) {
            try {
                if (this.flavor !== "rtr") {
                    this.chart = new TestChart(ctx!, this.transloco)
                } else if (this.phase === "ping") {
                    this.chart = new TestBarChart(
                        ctx!,
                        this.transloco,
                        this.phase
                    )
                } else {
                    this.chart = new TestLogChart(
                        ctx!,
                        this.transloco,
                        this.phase
                    )
                }
            } catch (e) {
                console.warn(e)
            }
        }
    }
}
