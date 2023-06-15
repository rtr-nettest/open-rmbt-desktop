import { ITestPhaseState } from "../interfaces/test-phase-state.interface"
import { TestLogChartDataset } from "./test-log-chart-dataset.dto"
import { TestChart } from "./test-chart.dto"
import { TestLogChartOptions } from "./test-log-chart-options.dto"

export class TestLogChart extends TestChart {
    constructor(
        context: CanvasRenderingContext2D,
        label: string,
        units: string
    ) {
        super(
            context,
            label,
            units,
            "line",
            {
                datasets: [new TestLogChartDataset()],
            },
            new TestLogChartOptions(units)
        )
    }

    override updateData(data: ITestPhaseState) {
        const lastData = super.getLastData(data)
        super.data.datasets[0].data.push(lastData)
        console.log("lastData", lastData)
        super.update()
    }
}
