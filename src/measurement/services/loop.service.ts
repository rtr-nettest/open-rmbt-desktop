import { Logger } from "./logger.service"

export class LoopService {
    private static instance = new LoopService()

    static get I() {
        return this.instance
    }

    loopCounter = 0
    loopTimeout?: NodeJS.Timeout

    private constructor() {}

    resetCounter() {
        this.loopCounter = 0
        clearTimeout(this.loopTimeout)
    }

    scheduleLoop(interval: number, callback: (counter: number) => void) {
        this.loopCounter += 1
        Logger.I.info(
            "Scheduling restart %d in %d ms",
            this.loopCounter,
            interval
        )
        this.loopTimeout = setTimeout(() => {
            Logger.I.info("Restarting test")
            callback(this.loopCounter)
        }, interval)
    }
}
