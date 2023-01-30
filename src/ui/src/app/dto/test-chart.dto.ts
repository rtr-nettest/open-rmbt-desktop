import { TestChartDataset } from "./test-chart-dataset.dto"
import { TestChartOptions } from "./test-chart-options.dto"
import { ITestPhaseState } from "../interfaces/test-phase-state.interface"
import * as Chart from "chart.js"

export class TestChart extends Chart {
    constructor(
        context:
            | string
            | CanvasRenderingContext2D
            | HTMLCanvasElement
            | ArrayLike<CanvasRenderingContext2D | HTMLCanvasElement>,
        label: string,
        units: string
    ) {
        const labels = []
        labels.length = 30
        for (let index = 0; index < labels.length; index++) {
            labels[index] = index
        }
        super(context, {
            type: "line",
            data: {
                datasets: [new TestChartDataset()],
                labels,
            },
            options: new TestChartOptions(units),
        })
    }

    resetData() {
        this.data.datasets = [new TestChartDataset()]
        this.data.labels = []
        this.update()
    }

    setData(data: ITestPhaseState) {
        this.data.datasets = [new TestChartDataset()]
        this.data.datasets[0].data = this.getAllData(data)
        this.data.labels = this.getAllLabels(data)
        this.update()
    }

    updateData(data: ITestPhaseState) {
        this.data?.datasets?.[0].data?.push(this.getLastData(data))
        const { length, value } = this.getLastLabel(data)
        if (length === 1 && this.data?.labels?.[0]) {
            this.data.labels[0] = value
        }
        this.update()
    }

    private getAllData(testItem: ITestPhaseState) {
        return testItem?.chart?.length ? testItem.chart.map((ti) => ti.y) : []
    }

    private getAllLabels(testItem: ITestPhaseState) {
        return testItem?.chart?.length ? testItem.chart.map((ti) => ti.x) : []
    }

    private getLastData(testItem: ITestPhaseState) {
        return testItem?.chart?.length
            ? testItem.chart[testItem.chart.length - 1].y
            : 0
    }

    private getLastLabel(testItem: ITestPhaseState) {
        return {
            length: testItem?.chart?.length,
            value: testItem?.chart?.length
                ? testItem.chart[testItem.chart.length - 1].x
                : 0,
        }
    }
}
