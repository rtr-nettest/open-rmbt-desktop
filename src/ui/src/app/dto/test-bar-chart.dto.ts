import { ITestPhaseState } from "../interfaces/test-phase-state.interface"
import {
    BarOptions,
    ChartPhase,
    TestRTRChartDataset,
} from "./test-rtr-chart-dataset.dto"
import { TestChart } from "./test-chart.dto"
import { TestBarChartOptions } from "./test-bar-chart-options.dto"
import { TranslocoService } from "@ngneat/transloco"
import {
    getBarWidth,
    PingBarChartPlugin,
} from "../plugins/ping-bar-chart-plugin"

export class TestBarChart extends TestChart {
    private barOptions?: BarOptions

    constructor(
        context: CanvasRenderingContext2D,
        transloco: TranslocoService,
        private phase: ChartPhase,
    ) {
        super(
            context,
            transloco,
            "bar",
            {
                datasets: [],
                labels: [],
            },
            new TestBarChartOptions(transloco),
            [new PingBarChartPlugin()],
        )
    }

    override setData(data: ITestPhaseState) {
        const allData = this.getAllData(data)
        this.barOptions = {
            barThickness: getBarWidth(allData), // the more bars the thinner they are
        }
        this.resetDatasets()
        this.data.datasets[0].data = allData
        this.finished = true
        this.update()
    }

    protected override resetDatasets(): void {
        this.data.datasets = [
            new TestRTRChartDataset(this.phase, this.barOptions),
        ]
    }

    protected override resetLabels(): void {
        this.data.labels = []
    }

    protected override getAllData(testItem: ITestPhaseState) {
        return testItem.chart?.length ? testItem.chart : []
    }
}
