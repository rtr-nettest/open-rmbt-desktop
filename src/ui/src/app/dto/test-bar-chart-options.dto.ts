import { TranslocoService } from "@ngneat/transloco"
import * as dayjs from "dayjs"
import { EColors } from "src/app/enums/colors.enum"

export class TestBarChartOptions {
    private startTime = dayjs().startOf("day").toDate().getTime()
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
            min: this.startTime,
            type: "time",
            grid: {
                offset: false,
            },
            title: {
                display: true,
                color: EColors.SECONDARY_50,
                font: {
                    size: 12,
                },
            },
            time: {
                unit: "millisecond",
            },
            offset: false,
            ticks: {
                color: EColors.SECONDARY_50,
                font: {
                    size: 12,
                },
                stepSize: 500,
                callback: (value: any) => {
                    const duration = (value - this.startTime) / 1000
                    if (duration % 0.5 === 0) {
                        return `${duration} ${this.t.translate("s")}`
                    }
                    return ""
                },
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
