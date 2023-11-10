import { Logger } from "./logger.service"

export class LoopService {
    private static instance = new LoopService()

    static get I() {
        return this.instance
    }

    loopCounter = 1
    loopInterval?: NodeJS.Timeout
    expireTimeout?: NodeJS.Timeout

    private constructor() {}

    resetCounter() {
        this.loopCounter = 1
        clearInterval(this.loopInterval)
        this.loopInterval = undefined
        clearTimeout(this.expireTimeout)
        this.expireTimeout = undefined
    }

    scheduleLoop(options: {
        interval: number
        onTime: (counter: number) => void
        onExpire?: () => void
    }) {
        if (!this.loopInterval) {
            this.loopInterval = setInterval(() => {
                this.loopCounter += 1
                Logger.I.info("Starting test %d", this.loopCounter)
                options.onTime(this.loopCounter)
            }, options.interval)
        }
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
