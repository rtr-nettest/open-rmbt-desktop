import { TestChartDataset } from "./test-chart-dataset.dto"
import { TestChartOptions } from "./test-chart-options.dto"
import { ITestPhaseState } from "../interfaces/test-phase-state.interface"
import { Chart, ChartData } from "chart.js"
import { generateIndexesOfLength } from "../helpers/array"
import { TranslocoService } from "@ngneat/transloco"

export class TestChart extends Chart {
    private finished = false

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

    resetData() {
        this.resetDatasets()
        this.resetLabels()
        this.finished = false
        this.update()
    }

    setData(data: ITestPhaseState) {
        this.resetDatasets()
        this.data.datasets[0].data = this.getAllData(data)
        this.finished = true
        this.update()
    }

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
