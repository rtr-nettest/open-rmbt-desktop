export const THRESHOLD_UPLOAD = [50000, 5000, 2500]
export const THRESHOLD_DOWNLOAD = [100000, 10000, 5000]
export const THRESHOLD_PING = [10000000, 25000000, 75000000]
export const CLASSIFICATION_ITEMS = 4

export class ClassificationService {
    private static instance = new ClassificationService()

    static get I() {
        return this.instance
    }

    private constructor() {}

    classify(
        value: number,
        threshold: number[],
        condition: "smallerBetter" | "biggerBetter"
    ) {
        threshold = threshold.sort((a, b) => b - a)
        let retVal = 1
        for (let i = 0; i < threshold.length; i++) {
            if (condition === "biggerBetter" && value >= threshold[i]) {
                retVal = CLASSIFICATION_ITEMS - i
                break
            } else if (condition === "smallerBetter" && value <= threshold[i]) {
                retVal++
            }
        }
        return Math.min(retVal, CLASSIFICATION_ITEMS)
    }
}
