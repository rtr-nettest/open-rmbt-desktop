import { MeasurementThreadResult } from "../dto/measurement-thread-result.dto"
import {
    IMeasurementThreadResult,
    IPing,
    ISpeedItem,
} from "../interfaces/measurement-result.interface"
import { IOverallResult } from "../interfaces/overall-result.interface"
import { TransferDirection } from "./rmbt-client.service"

type CurveItem = {
    bytes_total: number
    time_elapsed: number
    speed?: number
}

export class CalcService {
    private static instance = new CalcService()

    static get I() {
        return this.instance
    }

    private _prevNsec = {
        down: 0,
        up: 0,
    }

    private _prevBytes = {
        down: 0,
        up: 0,
    }

    private constructor() {}

    getOverallPings(
        pings: {
            ping_ms: number
            time_elapsed: number
        }[]
    ): IPing[] {
        if (!pings?.length) {
            return []
        }
        return pings.map((p) => ({
            time_ns: p.time_elapsed * 1e6,
            value: p.ping_ms * 1e6,
            value_server: p.ping_ms * 1e6,
        }))
    }

    getOverallResultsFromSpeedCurve(
        curve: CurveItem[],
        stepMs = 175 // value from RTR web
    ): IOverallResult[] {
        if (!curve?.length) {
            return []
        }
        if (!stepMs) {
            return curve.map(this.parseCurveItem)
        }
        const options = {
            lastBytes: 0,
            lastMs: 0,
            stepMs,
        }
        const resp: IOverallResult[] = [
            {
                bytes: 0,
                nsec: 0,
                speed: 0,
            },
        ]
        for (const ci of curve) {
            const result = this.calcResultForStep(ci, options)
            if (result) {
                resp.push(result)
            }
        }
        return resp
    }

    private calcResultForStep(
        ci: CurveItem,
        options: {
            lastBytes: number
            lastMs: number
            stepMs: number
        }
    ) {
        const { lastBytes, lastMs, stepMs } = options
        let retVal: IOverallResult | null = null
        if (ci.time_elapsed - lastMs >= stepMs) {
            retVal = this.parseCurveItem({
                bytes_total: ci.bytes_total,
                time_elapsed: ci.time_elapsed,
                speed: this.calcSpeed(
                    ci.bytes_total - lastBytes,
                    ci.time_elapsed - lastMs
                ),
            })
            options.lastBytes = ci.bytes_total
            options.lastMs = ci.time_elapsed
        }
        return retVal
    }

    private calcSpeed(bytes: number, timeMs: number) {
        return Math.max((bytes * 8) / (timeMs / 1e3), 0)
    }

    private parseCurveItem = (ci: CurveItem) => ({
        bytes: ci.bytes_total,
        nsec: ci.time_elapsed * 1e6,
        speed: ci.speed ?? this.calcSpeed(ci.bytes_total, ci.time_elapsed),
    })

    getOverallResultsFromSpeedItems(
        speedItems: ISpeedItem[],
        direction: "download" | "upload",
        step = 75
    ): IOverallResult[] {
        if (!speedItems) {
            return []
        }
        const key: TransferDirection = direction === "download" ? "down" : "up"
        const threadResultsMap: { [key: number]: IMeasurementThreadResult } = {}
        for (const speedItem of speedItems) {
            const index = speedItem.thread
            if (!threadResultsMap[index]) {
                threadResultsMap[index] = new MeasurementThreadResult(index)
            }
            if (speedItem.direction === "download") {
                threadResultsMap[index].down.bytes.push(speedItem.bytes)
                threadResultsMap[index].down.nsec.push(speedItem.time)
            } else if (speedItem.direction === "upload") {
                threadResultsMap[index].up.bytes.push(speedItem.bytes)
                threadResultsMap[index].up.nsec.push(speedItem.time)
            }
        }
        const threadResults = Object.values(threadResultsMap)
            .filter((threadResult) => !!threadResult[key].bytes.length)
            .sort((a, b) => b[key].bytes.length - a[key].bytes.length)
        const overallResults: IOverallResult[] = []
        const longestThread = threadResults[0]
        let lastMs = 0
        for (let i = 1; i <= longestThread[key].bytes.length; i++) {
            const threadsSlice = threadResults.map((threadResult) => {
                const newResult = new MeasurementThreadResult(
                    threadResult.index
                )
                newResult[key].nsec = threadResult[key].nsec.slice(0, i)
                newResult[key].bytes = threadResult[key].bytes.slice(0, i)
                return newResult
            })
            const fineResult = this.getFineResult(threadsSlice, key)
            const ms = fineResult.nsec / 1e6
            if (lastMs == 0 || ms - lastMs >= step) {
                overallResults.push(fineResult)
                step = ms
            }
        }
        return overallResults
    }

    getCoarseResult(
        threads: IMeasurementThreadResult[],
        resultKey: TransferDirection
    ): IOverallResult {
        if (process.env.FLAVOR === "ont") {
            return this.getCoarseResultONT(threads, resultKey)
        }
        return this.getCoarseResultRTR(threads, resultKey)
    }

    // Bytes / nsec for a part of the time of the test
    getCoarseResultRTR(
        threads: IMeasurementThreadResult[],
        resultKey: TransferDirection
    ): IOverallResult {
        let bytes = 0
        let minNsec = Infinity
        let maxNsec = 0

        for (const task of threads) {
            if (
                !(
                    task &&
                    task.currentTime?.[resultKey] >= 0 &&
                    task.currentTransfer?.[resultKey] >= 0
                )
            ) {
                continue
            }
            if (task.currentTime[resultKey] < minNsec) {
                minNsec = task.currentTime[resultKey]
            }
            if (task.currentTime[resultKey] > maxNsec) {
                maxNsec = task.currentTime[resultKey]
            }
            bytes += task.currentTransfer[resultKey]
        }

        let nsec = (maxNsec - minNsec) / 2 + minNsec
        nsec = isNaN(nsec) ? 0 : nsec

        const bytesDiff =
            this._prevBytes[resultKey] && bytes > this._prevBytes[resultKey]
                ? bytes - this._prevBytes[resultKey]
                : bytes
        const nsecDiff =
            this._prevNsec[resultKey] && nsec > this._prevNsec[resultKey]
                ? nsec - this._prevNsec[resultKey]
                : nsec

        let speed = (bytesDiff / nsecDiff) * 1e9 * 8.0
        speed = nsec === 0 ? 0 : isNaN(speed) ? 0 : speed
        this._prevBytes[resultKey] = bytes
        this._prevNsec[resultKey] = nsec
        return {
            bytes,
            nsec,
            speed,
        }
    }

    // Total bytes / total nsec transfer at a certain point of the test
    getCoarseResultONT(
        threads: IMeasurementThreadResult[],
        resultKey: TransferDirection
    ): IOverallResult {
        let bytes = 0
        let minNsec = Infinity
        let maxNsec = 0

        for (const task of threads) {
            if (
                !(
                    task &&
                    task.currentTime?.[resultKey] >= 0 &&
                    task.currentTransfer?.[resultKey] >= 0
                )
            ) {
                continue
            }
            if (task.currentTime[resultKey] < minNsec) {
                minNsec = task.currentTime[resultKey]
            }
            if (task.currentTime[resultKey] > maxNsec) {
                maxNsec = task.currentTime[resultKey]
            }
            bytes += task.currentTransfer[resultKey]
        }

        const nsec = (maxNsec - minNsec) / 2 + minNsec

        let speed = (bytes / nsec) * 1e9 * 8.0
        speed = nsec === 0 ? 0 : isNaN(speed) ? 0 : speed
        return {
            bytes,
            nsec,
            speed,
        }
    }

    // From https://github.com/rtr-nettest/rmbtws/blob/master/src/WebsockettestDatastructures.js#L177
    getFineResult(
        threads: IMeasurementThreadResult[],
        resultKey: TransferDirection
    ): IOverallResult {
        let targetTime = Infinity

        for (const task of threads) {
            if (!task) {
                continue
            }
            let nsecs = task[resultKey].nsec
            if (nsecs.length > 0) {
                if (nsecs[nsecs.length - 1] < targetTime) {
                    targetTime = nsecs[nsecs.length - 1]
                }
            }
        }

        let totalBytes = 0

        for (const task of threads) {
            if (!task) {
                continue
            }
            let phasedThreadNsec = task[resultKey].nsec
            let phasedThreadBytes = task[resultKey].bytes
            let phasedLength = phasedThreadNsec.length

            if (phasedLength > 0) {
                let targetIdx = phasedLength
                for (let j = 0; j < phasedLength; j++) {
                    if (phasedThreadNsec[j] >= targetTime) {
                        targetIdx = j
                        break
                    }
                }
                let calcBytes = 0
                if (phasedThreadNsec[targetIdx] === targetTime) {
                    // nsec[max] == targetTime
                    calcBytes = phasedThreadBytes[phasedLength - 1]
                } else {
                    let bytes1 =
                        targetIdx === 0 ? 0 : phasedThreadBytes[targetIdx - 1]
                    let bytes2 = phasedThreadBytes[targetIdx]
                    let bytesDiff = bytes2 - bytes1
                    let nsec1 =
                        targetIdx === 0 ? 0 : phasedThreadNsec[targetIdx - 1]
                    let nsec2 = phasedThreadNsec[targetIdx]
                    let nsecDiff = nsec2 - nsec1
                    let nsecCompensation = targetTime - nsec1
                    let factor = nsecCompensation / nsecDiff
                    let compensation = Math.round(bytesDiff * factor)

                    if (compensation < 0) {
                        compensation = 0
                    }
                    calcBytes = bytes1 + compensation
                }
                totalBytes += calcBytes
            }
        }
        return {
            bytes: totalBytes,
            nsec: targetTime,
            speed: (totalBytes * 8) / (targetTime / 1e9),
        }
    }
}
