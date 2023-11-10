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
    downIsComplete = false
    pingIsComplete = false

    get canvas() {
        return document.getElementById(this.id) as HTMLCanvasElement
    }

    get id() {
        return `${this.phase}_chart`
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
            this.chart?.setData(phaseTestState)
        })
    }

    private handleChanges(visualization: ITestVisualizationState) {
        this.ngZone.runOutsideAngular(async () => {
            if (!this.chart) {
                this.initChart()
            }
            switch (visualization.currentPhaseName) {
                case EMeasurementStatus.INIT:
                    this.chart?.resetData()
                    break
                case EMeasurementStatus.DOWN:
                    if (this.phase === "download") {
                        this.chart?.updateData(
                            visualization.phases[EMeasurementStatus.DOWN]
                        )
                    } else if (this.phase === "ping" && !this.pingIsComplete) {
                        this.chart?.setData(
                            visualization.phases[EMeasurementStatus.PING]
                        )
                        this.pingIsComplete = true
                    }
                    break
                case EMeasurementStatus.UP:
                    if (this.phase === "upload") {
                        this.chart?.updateData(
                            visualization.phases[EMeasurementStatus.UP]
                        )
                    } else if (
                        this.phase === "download" &&
                        !this.downIsComplete
                    ) {
                        this.chart?.setData(
                            visualization.phases[EMeasurementStatus.DOWN]
                        )
                        this.downIsComplete = true
                    }
                    break
                case EMeasurementStatus.SHOWING_RESULTS:
                    this.initChart()
                    if (this.phase === "download") {
                        this.chart?.setData(
                            visualization.phases[EMeasurementStatus.DOWN]
                        )
                    } else if (this.phase === "upload") {
                        this.chart?.setData(
                            visualization.phases[EMeasurementStatus.UP]
                        )
                    } else if (this.phase === "ping") {
                        this.chart?.setData(
                            visualization.phases[EMeasurementStatus.PING]
                        )
                    }
                    break
            }
        })
    }

    private initChart() {
        if (this.chart) {
            return
        }
        const ctx = this.canvas?.getContext("2d")
        if (!ctx) {
            return
        }
        try {
            if (this.flavor !== "rtr") {
                this.chart = new TestChart(ctx!, this.transloco)
            } else if (this.phase === "ping") {
                this.chart = new TestBarChart(ctx!, this.transloco, this.phase)
            } else {
                this.chart = new TestLogChart(ctx!, this.transloco, this.phase)
            }
        } catch (_) {}
    }
}
