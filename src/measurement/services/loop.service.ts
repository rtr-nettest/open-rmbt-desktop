import { WindowManager } from "../../electron/lib/window-manager"
import { MeasurementRunner } from ".."
import { ILoopModeInfo } from "../interfaces/measurement-registration-request.interface"
import { Logger } from "./logger.service"
import { powerSaveBlocker } from "electron"

// While a test is still running (it overran its slot) we re-check this often so
// the next test starts as soon as the current one finishes.
const POLL_MS = 1000

// A 0-minute interval (only selectable in debug mode) means "as fast as
// possible", but we still keep a small gap between test starts rather than
// running them truly back-to-back.
const ZERO_INTERVAL_MS = 5000

// In --debug mode the normal-loop duration limit is a hardcoded 480h, ignoring
// LOOP_MODE_MAX_DURATION. Ugly, but convenient for debugging a --debug build
// without touching .env.
const DEBUG_MAX_DURATION_MIN = 480 * 60

export class LoopService {
    private static instance = new LoopService()

    static get I() {
        return this.instance
    }

    loopTimeout?: NodeJS.Timeout
    powerSaverBlockerId?: number

    // Absolute wall-clock anchors for the running loop. Every test starts at
    // loopStartMs + (n-1)*interval, so cadence is fixed to the *start* of the
    // previous test regardless of how long it took or whether it failed.
    private loopStartMs = 0
    // For a normal loop: the time the loop force-expires (loopStartMs +
    // LOOP_MODE_MAX_DURATION). 0 = no duration limit (certified is bounded by
    // its test count instead).
    private expiryMs = 0

    private constructor() {}

    resetTimeout() {
        clearTimeout(this.loopTimeout)
        this.loopTimeout = undefined
        this.loopStartMs = 0
        this.expiryMs = 0
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
        const counter = options.loopModeInfo.test_counter

        // First test of a fresh loop: anchor the cadence and (for a normal loop)
        // the 48h expiry to this moment.
        if (counter <= 1) {
            this.loopStartMs = 0
            this.expiryMs = 0
        }
        if (!this.loopStartMs) {
            this.loopStartMs = Date.now()
            // The duration limit applies to a normal loop only; a certified run
            // is bounded by its test count (max_tests), not by wall-clock time.
            // --debug uses the hardcoded 480h limit instead of the configured one.
            let maxDurationMin = 0
            if (!options.loopModeInfo.max_tests) {
                maxDurationMin =
                    process.env.CLI_DEBUG === "true"
                        ? DEBUG_MAX_DURATION_MIN
                        : process.env.LOOP_MODE_MAX_DURATION
                          ? parseInt(process.env.LOOP_MODE_MAX_DURATION)
                          : 0
            }
            this.expiryMs =
                maxDurationMin > 0
                    ? this.loopStartMs + maxDurationMin * 60 * 1000
                    : 0
        }

        // Effective spacing between test starts; a 0 interval becomes a 5s gap.
        const interval =
            options.interval > 0 ? options.interval : ZERO_INTERVAL_MS

        // Absolute target for the NEXT test (test `counter + 1`, i.e. `counter`
        // intervals after the loop started).
        const nextTargetMs = this.loopStartMs + counter * interval

        clearTimeout(this.loopTimeout)

        const scheduleTick = () => {
            const fireAt = this.expiryMs
                ? Math.min(nextTargetMs, this.expiryMs)
                : nextTargetMs
            this.loopTimeout = setTimeout(tick, Math.max(0, fireAt - Date.now()))
        }

        const tick = () => {
            // A test is still running (or the app is suspended): never expire or
            // start mid-test — let the current test finish first.
            if (
                WindowManager.I.isSuspended ||
                MeasurementRunner.I.isMeasurementInProgress
            ) {
                this.loopTimeout = setTimeout(tick, POLL_MS)
                return
            }
            // Normal loop: once the max duration has elapsed, stop and notify.
            // Checked here — after a test has finished and while waiting — so it
            // fires at a test boundary rather than interrupting a running test.
            if (options.onExpire && this.expiryMs && Date.now() >= this.expiryMs) {
                Logger.I.info("Loop mode expired")
                this.resetTimeout()
                options.onExpire()
                return
            }
            // Time for the next test.
            if (Date.now() >= nextTargetMs) {
                MeasurementRunner.I.updateStartTime()
                Logger.I.info("Starting test %d", counter + 1)
                options.onTime(counter + 1)
                return
            }
            // Still waiting for the slot (e.g. woke early for an earlier expiry
            // check) — re-arm for the slot or the expiry, whichever is first.
            scheduleTick()
        }

        scheduleTick()

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
