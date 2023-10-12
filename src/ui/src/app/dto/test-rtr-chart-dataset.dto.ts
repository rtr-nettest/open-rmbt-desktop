export type ChartPhase = "download" | "upload" | "ping"
export type BarOptions = {
    barPercentage?: number
    barThickness: number | string
}

export class TestRTRChartDataset {
    fill = true
    backgroundColor!: string
    borderColor!: string
    borderCapStyle: "round" = "round"
    pointBackgroundColor = "transparent"
    pointBorderColor = "transparent"
    pointHoverBackgroundColor = "transparent"
    pointHoverBorderColor = "transparent"
    data: number[] = []

    constructor(
        phase: ChartPhase,
        barOptions: BarOptions = {
            barPercentage: 0.3,
            barThickness: "flex",
        }
    ) {
        if (phase === "download") {
            this.backgroundColor = "rgba(108, 209, 95, 0.33)"
            this.borderColor = "rgba(108, 209, 95, 1)"
        } else if (phase === "upload") {
            this.backgroundColor = "rgba(0, 128, 193, 0.33)"
            this.borderColor = "rgba(0, 128, 193, 1)"
        } else {
            this.backgroundColor = "rgb(39, 177, 220)"
            this.borderColor = "transparent"
            Object.assign(this, barOptions)
        }
    }
}
