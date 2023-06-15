import { EColors } from "../enums/colors.enum"

export type ChartPhase = "download" | "upload" | "ping"

export class TestLogChartDataset {
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
        } else {
            this.backgroundColor = "rgba(0, 128, 193, 0.33)"
            this.borderColor = "rgba(0, 128, 193, 1)"
        }
    }
}
