import { EColors } from "src/app/enums/colors.enum"

const ctx = document.createElement("canvas").getContext("2d")
const gradient = ctx!.createLinearGradient(0, 0, 0, 150)
gradient.addColorStop(0, EColors.GRADIENT_100)
gradient.addColorStop(1, EColors.GRADIENT_0)

export class TestChartDataset {
    backgroundColor = gradient
    borderColor = EColors.SECONDARY_100
    borderCapStyle: "round" = "round"
    lineTension = 0
    pointBackgroundColor = "transparent"
    pointBorderColor = "transparent"
    pointHoverBackgroundColor = "transparent"
    pointHoverBorderColor = "transparent"
    data: number[] = []
}
