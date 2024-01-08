import { WindowManager } from "../../electron/lib/window-manager"
import { MeasurementRunner } from ".."
import { ILoopModeInfo } from "../interfaces/measurement-registration-request.interface"
import { Logger } from "./logger.service"
import { powerSaveBlocker } from "electron"

export class LoopService {
    private static instance = new LoopService()

    static get I() {
        return this.instance
    }

    deviationAdjustment = 0
    loopTimeout?: NodeJS.Timeout
    expireTimeout?: NodeJS.Timeout
    powerSaverBlockerId?: number

    private constructor() {}

    resetTimeout() {
        clearTimeout(this.loopTimeout)
        this.loopTimeout = undefined
        clearTimeout(this.expireTimeout)
        this.expireTimeout = undefined
        this.deviationAdjustment = 0
        if (this.powerSaverBlockerId) {
            const stopped = powerSaveBlocker.stop(this.powerSaverBlockerId)
            Logger.I.warn(`Power saving is ${stopped ? "ON" : "OFF"}`)
            this.powerSaverBlockerId = stopped
                ? undefined
                : this.powerSaverBlockerId
        }
    }

    scheduleLoop(options: {
        interval: number
        loopModeInfo: ILoopModeInfo
        onTime: (counter: number) => void
        onExpire?: () => void
    }) {
        const { test_counter: counter } = options.loopModeInfo
        clearTimeout(this.loopTimeout)
        const setLoopTimeout = () => {
            const actualInterval = options.interval - this.deviationAdjustment
            return setTimeout(() => {
                MeasurementRunner.I.updateStartTime()
                this.deviationAdjustment = Date.now() % 1000
                if (
                    WindowManager.I.isSuspended ||
                    MeasurementRunner.I.isMeasurementInProgress
                ) {
                    this.loopTimeout = setLoopTimeout()
                } else {
                    const nextCounter = counter + 1
                    Logger.I.info(
                        "Starting test %d after %d ms",
                        nextCounter,
                        actualInterval
                    )
                    options.onTime(nextCounter)
                }
            }, actualInterval)
        }
        this.loopTimeout = setLoopTimeout()

        const expireTimeout = process.env.LOOP_MODE_MAX_DURATION
            ? parseInt(process.env.LOOP_MODE_MAX_DURATION)
            : 0
        if (!this.expireTimeout && options.onExpire && expireTimeout > 0) {
            this.expireTimeout = setTimeout(() => {
                Logger.I.info("Loop mode expired")
                this.resetTimeout()
                options.onExpire?.()
            }, expireTimeout * 60 * 1000)
        }

        if (!!options.loopModeInfo.max_tests && !this.powerSaverBlockerId) {
            this.powerSaverBlockerId = powerSaveBlocker.start(
                "prevent-display-sleep"
            )
            Logger.I.warn(
                `Power saving is ${
                    powerSaveBlocker.isStarted(this.powerSaverBlockerId)
                        ? "OFF"
                        : "ON"
                }`
            )
        }
    }
}
