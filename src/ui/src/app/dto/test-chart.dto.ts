import { TestChartDataset } from "./test-chart-dataset.dto"
import { TestChartOptions } from "./test-chart-options.dto"
import { ITestPhaseState } from "../interfaces/test-phase-state.interface"
import { Chart, ChartData } from "chart.js"
import { generateIndexesOfLength } from "../helpers/array"
import { TranslocoService } from "@ngneat/transloco"

export class TestChart extends Chart {
    finished = false

    constructor(
        private context: CanvasRenderingContext2D,
        transloco: TranslocoService,
        type: "line" | "bar" = "line",
        data: ChartData = {
            datasets: [new TestChartDataset(context)],
            labels: generateIndexesOfLength(100),
        },
        options: { [key: string]: any } = new TestChartOptions(transloco)
    ) {
        super(context, {
            type,
            data,
            options,
        })
    }

    /**
     * Empties `datasets` and `labels` arrays, sets the chart as not `finished`.
     */
    resetData() {
        this.resetDatasets()
        this.resetLabels()
        this.finished = false
        this.update()
    }

    /**
     * Empties `datasets`,
     * copies all the available data from `data.chart` to `datasets`,
     * sets the chart as `finished`.
     *
     * @param data the current phase state with a non-empty array field `chart`.
     */
    setData(data: ITestPhaseState) {
        this.resetDatasets()
        this.data.datasets[0].data = this.getAllData(data)
        this.finished = true
        this.update()
    }

    /**
     * Copies the last available item from `data.chart` to `datasets`, if the chart is not `finished`.
     * sets the chart as `finished` if the `x` of the last item values is >= 100.
     *
     * @param data the current phase state with a non-empty array field `chart`.
     */
    updateData(data: ITestPhaseState) {
        const lastData = this.getLastData(data)
        if (!lastData) {
            return
        }
        if (!this.finished) {
            this.data.datasets[0].data.push(lastData)
            this.update()
        }
        this.finished = !!lastData && lastData.x >= 100
    }

    protected resetLabels() {
        this.data.labels = []
    }

    protected resetDatasets() {
        this.data.datasets = [new TestChartDataset(this.context)]
    }

    protected getAllData(testItem: ITestPhaseState) {
        return testItem.chart?.length ? testItem.chart : []
    }

    protected getLastData(testItem: ITestPhaseState) {
        return testItem.chart?.length
            ? testItem.chart[testItem.chart.length - 1]
            : null
    }
}
