import { Window } from "../interfaces/window.interface"

export class Time {
    public static nowNs(): bigint {
        try {
            const { hrtime } = require("process")
            return hrtime.bigint()
        } catch (e) {
            return BigInt(new Date().getTime()) * BigInt(1e6)
        }
    }
}
