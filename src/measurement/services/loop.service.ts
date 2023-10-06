import { Logger } from "./logger.service"

export class LoopService {
    private static instance = new LoopService()

    static get I() {
        return this.instance
    }

    loopCounter = 0
    loopTimeout?: NodeJS.Timeout
    expireTimeout?: NodeJS.Timeout

    private constructor() {}

    resetCounter() {
        this.loopCounter = 0
        clearTimeout(this.loopTimeout)
        this.loopTimeout = undefined
        clearTimeout(this.expireTimeout)
        this.expireTimeout = undefined
    }

    scheduleLoop(options: {
        interval: number
        onTime: (counter: number) => void
        onExpire?: () => void
    }) {
        this.loopCounter += 1
        Logger.I.info(
            "Scheduling restart %d in %d ms",
            this.loopCounter,
            options.interval
        )
        this.loopTimeout = setTimeout(() => {
            Logger.I.info("Restarting test")
            options.onTime(this.loopCounter)
        }, options.interval)
        const expireTimeout = process.env.LOOP_MODE_MAX_DURATION
            ? parseInt(process.env.LOOP_MODE_MAX_DURATION)
            : 0
        if (!this.expireTimeout && options.onExpire && expireTimeout > 0) {
            this.expireTimeout = setTimeout(() => {
                Logger.I.info("Loop mode expired")
                options.onExpire?.()
            }, expireTimeout * 60 * 1000)
        }
    }
}
