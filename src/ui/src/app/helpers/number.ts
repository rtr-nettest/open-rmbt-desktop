export function getSignificantDigits(number: number) {
    let rounder = 1
    if (number < 0.1) {
        rounder = 1000
    } else if (number < 1) {
        rounder = 100
    } else if (number < 10) {
        rounder = 10
    }
    return Math.round(number * rounder) / rounder
}

export function speedLog(speedMbps?: number) {
    if (!speedMbps) {
        return -1
    }
    let yPercent = (2 + Math.log10(speedMbps / 10)) / 5
    yPercent = Math.max(yPercent, 0)
    yPercent = Math.min(1, yPercent)
    return yPercent
}
