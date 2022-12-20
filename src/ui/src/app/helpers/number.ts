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
