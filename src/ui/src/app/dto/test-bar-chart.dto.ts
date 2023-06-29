import { ITestPhaseState } from "../interfaces/test-phase-state.interface"
import { ChartPhase, TestRTRChartDataset } from "./test-rtr-chart-dataset.dto"
import { TestChart } from "./test-chart.dto"
import { TestBarChartOptions } from "./test-bar-chart-options.dto"
import { TranslocoService } from "@ngneat/transloco"

export class TestBarChart extends TestChart {
    constructor(
        context: CanvasRenderingContext2D,
        transloco: TranslocoService,
        private phase: ChartPhase
    ) {
        super(
            context,
            transloco,
            "bar",
            {
                datasets: [new TestRTRChartDataset(phase)],
                labels: [],
            },
            new TestBarChartOptions(transloco)
        )
    }

    override setData(data: ITestPhaseState) {
        this.resetDatasets()
        this.data.datasets[0].data = this.getAllData(data)
        this.data.labels = this.data.datasets[0].data.map(() => "")
        this.update()
    }

    protected override resetDatasets(): void {
        super.data.datasets = [new TestRTRChartDataset(this.phase)]
    }

    protected override resetLabels(): void {
        super.data.labels = []
    }
}
