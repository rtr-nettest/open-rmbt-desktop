import { EColors } from "../enums/colors.enum"

export class TestLogChartDataset {
    fill = true
    backgroundColor = EColors.PRIMARY_25
    borderColor = EColors.PRIMARY_100
    borderCapStyle: "round" = "round"
    lineTension = 0
    pointBackgroundColor = "transparent"
    pointBorderColor = "transparent"
    pointHoverBackgroundColor = "transparent"
    pointHoverBorderColor = "transparent"
    data: number[] = []

    constructor() {}
}
