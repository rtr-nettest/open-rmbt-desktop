import { EColors } from "src/app/enums/colors.enum"
import { TranslocoService } from "@ngneat/transloco"

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
    maintainAspectRatio = false
    normalized = true
    parsing = false as const
    scales = {
        x: {
            grid: {
                display: false,
            },
            title: {
                display: true,
                color: EColors.SECONDARY_50,
                font: {
                    size: 12,
                },
            },
            ticks: {
                display: false,
            },
        },
        y: {
            beginAtZero: true,
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
                labelString: this.t.translate("Mbps"),
            },
            position: "right",
            ticks: {
                color: EColors.SECONDARY_50,
                font: {
                    size: 12,
                },
                maxTicksLimit: 6,
                stepSize: 1,
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
