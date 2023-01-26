export function convertMs(value: number) {
    const resultNum = Math.round(value)
    let rounder = 1
    if (resultNum < 10) {
        rounder = 100
    } else if (resultNum < 100) {
        rounder = 10
    }
    return Math.round(value * rounder) / rounder
}
