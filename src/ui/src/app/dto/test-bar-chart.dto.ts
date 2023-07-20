import { ITestPhaseState } from "../interfaces/test-phase-state.interface"
import {
    BarOptions,
    ChartPhase,
    TestRTRChartDataset,
} from "./test-rtr-chart-dataset.dto"
import { TestChart } from "./test-chart.dto"
import { TestBarChartOptions } from "./test-bar-chart-options.dto"
import { TranslocoService } from "@ngneat/transloco"

export class TestBarChart extends TestChart {
    private barOptions?: BarOptions

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
                datasets: [],
                labels: [],
            },
            new TestBarChartOptions(transloco)
        )
    }

    override setData(data: ITestPhaseState) {
        const allData = this.getAllData(data)
        if (allData.length > 100) {
            this.barOptions = {
                barPercentage: 0.1,
                barThickness: 0.5,
                maxBarThickness: 1,
            }
        }
        this.resetDatasets()
        this.data.datasets[0].data = allData
        this.data.labels = this.data.datasets[0].data.map(() => "")
        this.update()
    }

    protected override resetDatasets(): void {
        super.data.datasets = [
            new TestRTRChartDataset(this.phase, this.barOptions),
        ]
    }

    protected override resetLabels(): void {
        super.data.labels = []
    }
}
