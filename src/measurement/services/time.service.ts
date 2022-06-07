import { Window } from "../interfaces/window.interface"

export class Time {
    public static nowNs(): bigint {
        const window = globalThis as Window
        if (typeof window.performance != "undefined") {
            return BigInt(window.performance.now()) * BigInt(1e6)
        }
        try {
            const { hrtime } = require("process")
            return hrtime.bigint()
        } catch (e) {
            return BigInt(new Date().getTime()) * BigInt(1e6)
        }
    }
}
