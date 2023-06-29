import { EColors } from "src/app/enums/colors.enum"
import { TranslocoService } from "@ngneat/transloco"

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
            title: {
                display: true,
                color: EColors.SECONDARY_50,
                font: {
                    size: 12,
                },
            },
            ticks: {
                callback: (value: any) => `${value} ${this.t.translate("s")}`,
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
                    if (retVal >= 1000) {
                        return `${retVal / 1000} ${this.t.translate("Gbps")}`
                    }
                    return `${retVal} ${this.t.translate("Mbps")}`
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

    constructor(private t: TranslocoService) {}
}
