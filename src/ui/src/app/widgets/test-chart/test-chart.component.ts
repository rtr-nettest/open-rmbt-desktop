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

@Component({
    selector: "nt-test-chart",
    templateUrl: "./test-chart.component.html",
    styleUrls: ["./test-chart.component.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TestChartComponent {
    @Input() direction: "download" | "upload" = "download"
    @Input() width = 0

    chart: TestChart | undefined
    visualization$: Observable<ITestVisualizationState> =
        this.store.visualization$.pipe(
            withLatestFrom(
                this.transloco.selectTranslate("test.progress.label"),
                this.transloco.selectTranslate("test.download.units")
            ),
            map(([s, label, units]) => {
                this.handleChanges(s, label, units)
                return s
            })
        )

    get id() {
        return `${this.direction}_chart`
    }

    constructor(
        private ngZone: NgZone,
        private store: TestStore,
        private transloco: TranslocoService
    ) {}

    private handleChanges(
        visualization: ITestVisualizationState,
        label: string,
        units: string
    ) {
        this.ngZone.runOutsideAngular(async () => {
            if (
                visualization.currentPhaseName === EMeasurementStatus.PING ||
                visualization.currentPhaseName ===
                    EMeasurementStatus.SHOWING_RESULTS
            ) {
                this.initChart(label, units)
            }
            if (
                visualization.currentPhaseName === EMeasurementStatus.INIT &&
                this.chart
            ) {
                this.chart.resetData()
            }
            if (this.chart) {
                if (
                    visualization.currentPhaseName ===
                        EMeasurementStatus.DOWN &&
                    this.direction === "download"
                ) {
                    this.chart.updateData(
                        visualization.phases[EMeasurementStatus.DOWN]
                    )
                }

                if (
                    visualization.currentPhaseName === EMeasurementStatus.UP &&
                    this.direction === "upload"
                ) {
                    this.chart.updateData(
                        visualization.phases[EMeasurementStatus.UP]
                    )
                }

                if (
                    visualization.currentPhaseName ===
                    EMeasurementStatus.SHOWING_RESULTS
                ) {
                    if (this.direction === "download") {
                        this.chart.setData(
                            visualization.phases[EMeasurementStatus.DOWN]
                        )
                    } else {
                        this.chart.setData(
                            visualization.phases[EMeasurementStatus.UP]
                        )
                    }
                }
            }
        })
    }

    private initChart(label: string, units: string) {
        if (this.chart) {
            return
        }
        const ctx = (
            document.getElementById(this.id) as HTMLCanvasElement
        )?.getContext("2d")
        if (ctx) {
            this.chart = new TestChart(ctx!, label, units)
        }
    }
}
