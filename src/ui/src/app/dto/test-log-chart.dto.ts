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
            },
            new TestLogChartOptions(units)
        )
    }

    protected override setNewDatasets(): void {
        super.data.datasets = [new TestLogChartDataset(this.phase)]
    }

    override updateData(data: ITestPhaseState) {
        const lastData = super.getLastData(data)
        super.data.datasets[0].data.push(lastData)
        console.log("lastData", lastData)
        super.update()
    }
}
