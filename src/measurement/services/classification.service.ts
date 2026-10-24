import {
    IClassBoundaries,
    IUserSettings,
} from "../interfaces/user-settings-response.interface"
import { SETTINGS, Store } from "./store.service"

// Fallback thresholds, used until the control server's /settings response has
// been fetched, or for an older server that doesn't deliver
// classification_thresholds. Units match the classify() call sites and the
// values the app shipped with: download/upload in kbit/s, ping in ns, signal in
// dBm. Each array holds the lower boundaries of buckets 2..CLASSIFICATION_ITEMS.
export const THRESHOLD_UPLOAD = [50000, 5000, 2500]
export const THRESHOLD_DOWNLOAD = [100000, 10000, 5000]
export const THRESHOLD_PING = [10000000, 25000000, 75000000]
export const THRESHOLD_SIGNAL_WIFI = [-51, -61, -76]
export const THRESHOLD_SIGNAL_MOBILE = [-75, -85, -101]
export const THRESHOLD_SIGNAL_MOBILE_RSRP = [-85, -95, -111]
export const CLASSIFICATION_ITEMS = 4

// Thresholds in the units classify() expects: download/upload = kbit/s,
// ping = ns, signal = dBm.
export interface IClassificationThresholdSet {
    download: number[]
    upload: number[]
    ping: number[]
    signalWifi: number[]
    signalMobile: number[]
    signalMobileRsrp: number[]
}

export class ClassificationService {
    private static instance = new ClassificationService()

    static get I() {
        return this.instance
    }

    private constructor() {}

    /**
     * Color-classification thresholds. The control server now delivers these in
     * its /settings response (`classification_thresholds`); we mirror the web
     * client and use them instead of the hardcoded defaults, falling back to the
     * shipped defaults when settings aren't available yet or the server is older.
     */
    getThresholds(): IClassificationThresholdSet {
        const ct = (Store.I.get(SETTINGS) as IUserSettings | undefined)
            ?.classification_thresholds
        return {
            download: this.fromBoundaries(ct?.download_kbit, THRESHOLD_DOWNLOAD),
            upload: this.fromBoundaries(ct?.upload_kbit, THRESHOLD_UPLOAD),
            // Settings deliver ping in ms; classify() receives ns, so scale up.
            ping: this.fromBoundaries(ct?.ping_ms, THRESHOLD_PING, 1e6),
            signalWifi: this.fromBoundaries(
                ct?.signal_wifi,
                THRESHOLD_SIGNAL_WIFI,
            ),
            signalMobile: this.fromBoundaries(
                ct?.signal_mobile,
                THRESHOLD_SIGNAL_MOBILE,
            ),
            signalMobileRsrp: this.fromBoundaries(
                ct?.signal_mobile_rsrp,
                THRESHOLD_SIGNAL_MOBILE_RSRP,
            ),
        }
    }

    /**
     * Convert the control server's { "2": lower, "3": lower, "4": lower } bucket
     * boundary map into the flat threshold array classify() expects (order is
     * irrelevant — classify() sorts). `scale` converts units (e.g. ms -> ns).
     * Returns a copy of `fallback` when the map is missing or unusable.
     */
    private fromBoundaries(
        boundaries: IClassBoundaries | undefined,
        fallback: number[],
        scale = 1,
    ): number[] {
        if (!boundaries) {
            return [...fallback]
        }
        const values = Object.values(boundaries)
            .map((v) => Number(v))
            .filter((v) => !isNaN(v))
        return values.length ? values.map((v) => v * scale) : [...fallback]
    }

    classify(
        value: number | null | undefined,
        threshold: number[],
        condition: "smallerBetter" | "biggerBetter",
    ) {
        if (value === null || value === undefined || isNaN(value)) {
            return undefined
        }
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
