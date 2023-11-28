import { MeasurementRunner } from ".."
import { EMeasurementStatus } from "../enums/measurement-status.enum"
import { ILoopModeInfo } from "../interfaces/measurement-registration-request.interface"
import { Logger } from "./logger.service"

export class LoopService {
    private static instance = new LoopService()

    static get I() {
        return this.instance
    }

    deviationAdjustment = 0
    loopTimeout?: NodeJS.Timeout
    expireTimeout?: NodeJS.Timeout

    private constructor() {}

    resetCounter() {
        clearTimeout(this.loopTimeout)
        this.loopTimeout = undefined
        clearTimeout(this.expireTimeout)
        this.expireTimeout = undefined
        this.deviationAdjustment = 0
    }

    scheduleLoop(options: {
        interval: number
        loopModeInfo: ILoopModeInfo
        onTime: (counter: number) => void
        onExpire?: () => void
    }) {
        const counter = options.loopModeInfo.test_counter
        clearTimeout(this.loopTimeout)
        const setLoopTimeout = () => {
            const actualInterval = options.interval - this.deviationAdjustment
            return setTimeout(() => {
                Logger.I.info(
                    "Starting test %d after %d ms",
                    counter + 1,
                    actualInterval
                )
                this.deviationAdjustment = Date.now() % 1000
                const endPhases = [
                    EMeasurementStatus.END,
                    EMeasurementStatus.ERROR,
                ]
                if (
                    endPhases.includes(
                        MeasurementRunner.I.getCurrentPhaseState().phase
                    )
                ) {
                    options.onTime(counter + 1)
                } else {
                    this.loopTimeout = setLoopTimeout()
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
                this.resetCounter()
                options.onExpire?.()
            }, expireTimeout * 60 * 1000)
        }
    }
}
