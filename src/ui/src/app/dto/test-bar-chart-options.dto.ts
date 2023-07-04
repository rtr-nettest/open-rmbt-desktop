import { TranslocoService } from "@ngneat/transloco"
import { EColors } from "src/app/enums/colors.enum"

export class TestBarChartOptions {
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
                callback: () => "",
            },
        },
        y: {
            beginAtZero: true,
            min: 0,
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
                maxTicksLimit: 6,
                stepSize: 10,
                callback: (value: any) => {
                    return `${value} ${this.t.translate("ms")}`
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
