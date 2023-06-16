export type ChartPhase = "download" | "upload" | "ping"

export class TestRTRChartDataset {
    fill = true
    backgroundColor!: string
    borderColor!: string
    borderCapStyle: "round" = "round"
    lineTension = 0
    pointBackgroundColor = "transparent"
    pointBorderColor = "transparent"
    pointHoverBackgroundColor = "transparent"
    pointHoverBorderColor = "transparent"
    data: number[] = []

    constructor(phase: ChartPhase) {
        if (phase === "download") {
            this.backgroundColor = "rgba(108, 209, 95, 0.33)"
            this.borderColor = "rgba(108, 209, 95, 1)"
        } else if (phase === "upload") {
            this.backgroundColor = "rgba(0, 128, 193, 0.33)"
            this.borderColor = "rgba(0, 128, 193, 1)"
        } else {
            this.backgroundColor = "rgb(39, 177, 220)"
            this.borderColor = "transparent"
            Object.assign(this, {
                barPercentage: 0.5,
                barThickness: 6,
                maxBarThickness: 8,
            })
        }
    }
}
