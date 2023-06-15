import { TestChartDataset } from "./test-chart-dataset.dto"
import { TestChartOptions } from "./test-chart-options.dto"
import { ITestPhaseState } from "../interfaces/test-phase-state.interface"
import { Chart, ChartData } from "chart.js"

export class TestChart extends Chart {
    private finished = false

    constructor(
        private context: CanvasRenderingContext2D,
        label: string,
        units: string,
        type: "line" | "bar" = "line",
        data: ChartData = {
            datasets: [new TestChartDataset(context)],
            labels: Array(100)
                .fill(0)
                .map((_, idx) => 0 + idx),
        },
        options: { [key: string]: any } = new TestChartOptions(units)
    ) {
        super(context, {
            type,
            data,
            options,
        })
    }

    resetData() {
        this.setNewDatasets()
        this.data.labels = []
        this.finished = false
        this.update()
    }

    setData(data: ITestPhaseState) {
        this.setNewDatasets()
        this.data.datasets[0].data = this.getAllData(data)
        this.finished = true
        this.update()
    }

    updateData(data: ITestPhaseState) {
        const lastData = this.getLastData(data)
        if (!this.finished) {
            this.data.datasets[0].data.push(lastData)
            this.update()
        }
        this.finished = !!lastData && lastData.x >= 100
    }

    protected setNewDatasets() {
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
