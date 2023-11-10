import { ILoopModeInfo } from "../interfaces/measurement-registration-request.interface"
import { Logger } from "./logger.service"

export class LoopService {
    private static instance = new LoopService()

    static get I() {
        return this.instance
    }

    loopStartTime = 0
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
        this.loopStartTime = 0
    }

    scheduleLoop(options: {
        interval: number
        loopModeInfo: ILoopModeInfo
        onTime: (counter: number) => void
        onExpire?: () => void
    }) {
        if (!this.loopStartTime) {
            this.loopStartTime = Date.now()
        }
        const counter = options.loopModeInfo.test_counter
        this.loopTimeout = setTimeout(() => {
            this.deviationAdjustment =
                (Date.now() - this.loopStartTime) % options.interval
            Logger.I.info("Starting test %d")
            options.onTime(counter + 1)
        }, options.interval - this.deviationAdjustment)
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
