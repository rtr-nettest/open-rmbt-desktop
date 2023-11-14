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
        this.barOptions = {
            barThickness: 6 * (10 / allData.length),
        }
        this.resetDatasets()
        if (!this.finished) {
            const padder = { ...allData[allData.length - 1] }
            padder.x += 10
            padder.y = 0
            allData.push(padder)
        }
        this.data.datasets[0].data = allData
        this.finished = true
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
