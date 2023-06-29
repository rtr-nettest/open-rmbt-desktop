import { ITestPhaseState } from "../interfaces/test-phase-state.interface"
import { ChartPhase, TestRTRChartDataset } from "./test-rtr-chart-dataset.dto"
import { TestLogChartOptions } from "./test-log-chart-options.dto"
import { TranslocoService } from "@ngneat/transloco"
import { TestChart } from "./test-chart.dto"
export class TestLogChart extends TestChart {
    constructor(
        context: CanvasRenderingContext2D,
        transloco: TranslocoService,
        private phase: ChartPhase
    ) {
        super(
            context,
            transloco,
            "line",
            {
                datasets: [new TestRTRChartDataset(phase)],
                labels: [],
            },
            new TestLogChartOptions(transloco)
        )
    }

    override updateData(data: ITestPhaseState) {
        const lastData = super.getLastData(data)
        if (!lastData) {
            return
        }
        const lastIndex = Math.ceil(lastData.x)
        super.data.datasets[0].data.push(lastData)
        if (super.data.labels && super.data.labels.length <= lastIndex)
            super.data.labels.push(lastIndex)
        super.update()
    }

    protected override resetDatasets(): void {
        super.data.datasets = [new TestRTRChartDataset(this.phase)]
    }

    protected override resetLabels(): void {
        super.data.labels = []
    }
}
