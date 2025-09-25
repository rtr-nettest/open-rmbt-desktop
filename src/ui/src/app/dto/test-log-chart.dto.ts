import { ITestPhaseState } from "../interfaces/test-phase-state.interface"
import { ChartPhase, TestRTRChartDataset } from "./test-rtr-chart-dataset.dto"
import { TestLogChartOptions } from "./test-log-chart-options.dto"
import { TranslocoService } from "@ngneat/transloco"
import { TestChart } from "./test-chart.dto"
import { generateIndexesOfLength } from "../helpers/array"
import { Point } from "chart.js"

export class TestLogChart extends TestChart {
    constructor(
        context: CanvasRenderingContext2D,
        transloco: TranslocoService,
        private phase: ChartPhase,
        maxValue?: number,
    ) {
        super(
            context,
            transloco,
            "line",
            {
                datasets: [new TestRTRChartDataset(phase)],
                labels: generateIndexesOfLength(8),
            },
            new TestLogChartOptions(transloco, maxValue),
        )
    }

    override setData(data: ITestPhaseState) {
        this.resetDatasets()
        this.data.datasets[0].data = this.getAllData(data)
        const firstZeroIndex = this.data.datasets[0].data.findIndex(
            (point) => (point as Point).x === 0,
        )
        if (firstZeroIndex !== -1) {
            this.data.datasets[0].data = this.data.datasets[0].data.slice(
                firstZeroIndex + 1,
            )
        }
        const lastIndex = Math.ceil(
            (
                this.data.datasets[0].data[
                    this.data.datasets[0].data.length - 1
                ] as Point
            ).x,
        )
        const { labels } = this.data
        if (labels) {
            if (labels.length <= lastIndex) {
                while (labels!.length <= lastIndex) {
                    labels.push(lastIndex)
                }
            }
        }
        if (this.options.scales?.["x"]) {
            this.options.scales["x"].max = Math.max(7, lastIndex)
        }
        this.finished = true
        this.update()
    }

    override updateData(data: ITestPhaseState) {
        const lastData = super.getLastData(data)
        if (!lastData) {
            return
        }
        const lastIndex = Math.ceil(lastData.x)
        this.data.datasets[0].data.push(lastData)
        if (this.data.labels && this.data.labels.length <= lastIndex)
            this.data.labels.push(lastIndex)
        if (this.options.scales?.["x"]) {
            this.options.scales["x"].max = Math.max(7, lastIndex)
        }
        super.update()
    }

    protected override resetDatasets(): void {
        this.data.datasets = [new TestRTRChartDataset(this.phase)]
    }

    protected override resetLabels(): void {
        this.data.labels = generateIndexesOfLength(8)
    }

    protected override getAllData(testItem: ITestPhaseState) {
        return testItem.chart?.length ? testItem.chart : []
    }
}
