import { EColors } from "src/app/enums/colors.enum"

export class TestChartOptions {
    animation = {
        duration: 0,
    }
    layout = {
        padding: {
            left: 0,
            right: 0,
        },
    }
    legend = {
        display: false,
    }
    maintainAspectRatio = false
    normalized = true
    parsing = false
    scales = {
        xAxes: [
            {
                gridLines: {
                    display: false,
                },
                scaleLabel: {
                    display: true,
                    fontColor: EColors.SECONDARY_50,
                    fontSize: 12,
                },
                ticks: {
                    display: false,
                },
            },
        ],
        yAxes: [
            {
                minRotation: 0,
                maxRotation: 0,
                gridLines: {
                    color: EColors.SECONDARY_10,
                },
                scaleLabel: {
                    display: true,
                    fontColor: EColors.SECONDARY_50,
                    fontSize: 12,
                    labelString: "Mbps",
                },
                position: "right",
                ticks: {
                    fontColor: EColors.SECONDARY_50,
                    fontSize: 12,
                    maxTicksLimit: 6,
                    stepSize: 1,
                    beginAtZero: true,
                },
            },
        ],
    }
    tooltips = {
        enabled: false,
    }

    constructor(yLabel: string) {
        this.scales.yAxes[0].scaleLabel.labelString = yLabel
    }
}
