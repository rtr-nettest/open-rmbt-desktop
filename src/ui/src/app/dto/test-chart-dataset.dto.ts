import { EColors } from "../enums/colors.enum"

export class TestChartDataset {
    fill = true
    backgroundColor: CanvasGradient
    borderColor = EColors.PRIMARY_100
    borderCapStyle: "round" = "round"
    lineTension = 0
    pointBackgroundColor = "transparent"
    pointBorderColor = "transparent"
    pointHoverBackgroundColor = "transparent"
    pointHoverBorderColor = "transparent"
    data: number[] = []

    constructor(context: CanvasRenderingContext2D) {
        const gradient = context.createLinearGradient(0, 0, 0, 150)
        gradient.addColorStop(0, EColors.GRADIENT_100)
        gradient.addColorStop(1, EColors.GRADIENT_0)
        this.backgroundColor = gradient
    }
}
