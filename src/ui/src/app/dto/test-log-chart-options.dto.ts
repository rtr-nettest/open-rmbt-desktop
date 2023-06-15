import { EColors } from "src/app/enums/colors.enum"

export class TestLogChartOptions {
    animation = {
        duration: 0,
    }
    layout = {
        padding: {
            left: 0,
            right: 0,
        },
    }
    maintainAspectRatio = false
    normalized = true
    parsing = false as const
    scales = {
        x: {
            grid: {
                color: EColors.SECONDARY_10,
            },
            time: {
                unit: "second",
            },
            title: {
                display: true,
                color: EColors.SECONDARY_50,
                font: {
                    size: 12,
                },
            },
            type: "time",
            ticks: {
                callback: (value: any, index: number) => `${index + 1} s`,
            },
        },
        y: {
            beginAtZero: true,
            min: 0,
            max: 1,
            minRotation: 0,
            maxRotation: 0,
            grid: {
                color: EColors.SECONDARY_10,
            },
            title: {
                display: true,
                color: EColors.SECONDARY_50,
                font: {
                    size: 12,
                },
                labelString: "Mbps",
            },
            ticks: {
                color: EColors.SECONDARY_50,
                font: {
                    size: 12,
                },
                stepSize: 0.2,
                autoSkip: false,
                callback: (value: any, index: number) => {
                    let retVal = 0.1
                    if (index > 0) {
                        retVal = 10 ** (index - 1)
                    }
                    return `${retVal} Mbps`
                },
            },
        },
    }
    plugins = {
        legend: {
            display: false,
        },
        tooltip: {
            enabled: false,
        },
    }

    constructor(yLabel: string) {
        this.scales.y.title.labelString = yLabel
    }
}
