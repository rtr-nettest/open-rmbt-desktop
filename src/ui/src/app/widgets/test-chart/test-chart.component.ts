import {
    Component,
    Input,
    NgZone,
    ChangeDetectionStrategy,
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

@Component({
    selector: "nt-test-chart",
    templateUrl: "./test-chart.component.html",
    styleUrls: ["./test-chart.component.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TestChartComponent {
    @Input() phase: ChartPhase = "download"
    @Input() type: "line" | "bar" = "line"

    chart: TestChart | undefined
    visualization$: Observable<ITestVisualizationState> =
        this.store.visualization$.pipe(
            withLatestFrom(this.mainStore.env$),
            map(([s, env]) => {
                this.flavor = env?.FLAVOR || "rtr"
                this.handleChanges(s)
                return s
            })
        )
    flavor?: string

    get id() {
        return `${this.phase}_chart`
    }

    constructor(
        private mainStore: MainStore,
        private ngZone: NgZone,
        private store: TestStore,
        private transloco: TranslocoService
    ) {}

    private handleChanges(visualization: ITestVisualizationState) {
        this.ngZone.runOutsideAngular(async () => {
            switch (visualization.currentPhaseName) {
                case EMeasurementStatus.INIT:
                    this.chart?.resetData()
                    if (this.flavor === "rtr") {
                        this.initChart()
                    }
                    break
                case EMeasurementStatus.PING:
                    if (this.flavor !== "rtr") {
                        this.initChart()
                    }
                    break
                case EMeasurementStatus.DOWN:
                    if (this.phase === "download") {
                        this.chart?.updateData(
                            visualization.phases[EMeasurementStatus.DOWN]
                        )
                    } else if (this.phase === "ping") {
                        this.chart?.setData(
                            visualization.phases[EMeasurementStatus.PING]
                        )
                    }
                    break
                case EMeasurementStatus.UP:
                    if (this.phase === "upload") {
                        this.chart?.updateData(
                            visualization.phases[EMeasurementStatus.UP]
                        )
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
                    }
                    break
            }
        })
    }

    private initChart() {
        if (this.chart) {
            return
        }
        const canvas = document.getElementById(this.id) as HTMLCanvasElement
        const ctx = canvas?.getContext("2d")
        if (!ctx) {
            return
        }
        if (this.flavor !== "rtr") {
            this.chart = new TestChart(ctx!, this.transloco)
        } else if (this.phase === "ping") {
            this.chart = new TestBarChart(ctx!, this.transloco, this.phase)
        } else {
            this.chart = new TestLogChart(ctx!, this.transloco, this.phase)
        }
    }
}
