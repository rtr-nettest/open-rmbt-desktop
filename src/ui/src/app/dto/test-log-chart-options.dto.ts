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
        },
        y: {
            beginAtZero: true,
            min: 0,
            max: 100,
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
