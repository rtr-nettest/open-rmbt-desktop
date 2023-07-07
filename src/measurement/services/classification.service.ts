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
            const cond1 = condition === "smallerBetter" && value <= threshold[i]
            const cond2 = condition === "biggerBetter" && value >= threshold[i]
            if (cond1 || cond2) {
                retVal = CLASSIFICATION_ITEMS - i
            }
        }
        return retVal
    }
}
