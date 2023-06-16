import { ITestPhaseState } from "../interfaces/test-phase-state.interface"
import { ChartPhase, TestLogChartDataset } from "./test-log-chart-dataset.dto"
import { TestChart } from "./test-chart.dto"
import { TestLogChartOptions } from "./test-log-chart-options.dto"
export class TestLogChart extends TestChart {
    constructor(
        context: CanvasRenderingContext2D,
        label: string,
        units: string,
        private phase: ChartPhase
    ) {
        super(
            context,
            label,
            units,
            "line",
            {
                datasets: [new TestLogChartDataset(phase)],
                labels: [],
            },
            new TestLogChartOptions(units)
        )
    }

    override updateData(data: ITestPhaseState) {
        const lastData = super.getLastData(data)
        const lastIndex = Math.ceil(lastData?.x ?? 0)
        super.data.datasets[0].data.push(lastData)
        if (super.data.labels && super.data.labels.length <= lastIndex)
            super.data.labels.push(lastIndex)
        super.update()
    }

    protected override resetDatasets(): void {
        super.data.datasets = [new TestLogChartDataset(this.phase)]
    }

    protected override resetLabels(): void {
        super.data.labels = []
    }
}
