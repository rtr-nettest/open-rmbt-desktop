import { WindowManager } from "../../electron/lib/window-manager"
import { MeasurementRunner } from ".."
import { ILoopModeInfo } from "../interfaces/measurement-registration-request.interface"
import { Logger } from "./logger.service"
import { powerSaveBlocker } from "electron"

// While a test is still running (it overran its slot) we re-check this often so
// the next test starts as soon as the current one finishes.
const POLL_MS = 1000

// Minimum gap between the END of one test and the START of the next, so tests
// never run back-to-back. A 0-minute interval (debug only) means "just this
// break after each test finishes".
const MIN_BREAK_MS = 5000

// Grace window after a test is triggered before "not in progress" is treated as
// "finished" — covers the async startup gap (e.g. JS-engine registration), so a
// test that hasn't registered as running yet is not mistaken for a finished one.
const STARTUP_GRACE_MS = 10000

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

        // scheduleLoop runs as THIS test begins, so `startMs` is its ACTUAL start
        // time — used only for the startup-grace check below.
        const startMs = Date.now()
        // The next test's target is anchored to the NOMINAL raster
        // (loopStartMs + n*interval), NOT to this test's actual start. Anchoring
        // to the actual start would fold each test's small startup latency into
        // the cadence and accumulate it (observed drift ~1s per 30 tests). With
        // the nominal raster, test n always targets loopStartMs + (n-1)*interval,
        // so a test that starts a little late (or overran, handled by the
        // Math.max below) never shifts the raster for the tests that follow.
        // `counter` is the current test's number (1-based), so the next test
        // (counter + 1) nominally starts at loopStartMs + counter*interval.
        const startTargetMs = this.loopStartMs + counter * options.interval

        clearTimeout(this.loopTimeout)

        // The next test must start at the LATER of:
        //   • its NOMINAL raster slot, loopStartMs + counter*interval (fixed
        //     cadence when the interval exceeds the test duration), and
        //   • MIN_BREAK after this test finished   (so there is always a gap, and
        //     a 0 interval means "MIN_BREAK after each test finishes").
        // Anchoring the break to the finish time is why we poll through the run
        // to detect it, rather than firing on an absolute clock (which piled up
        // overlapping catch-up tests when a test ran longer than the interval).
        let wasRunning = false
        let finishMs = 0

        const tick = () => {
            const now = Date.now()

            if (
                WindowManager.I.isSuspended ||
                MeasurementRunner.I.isMeasurementInProgress
            ) {
                wasRunning = true
                finishMs = 0
                this.loopTimeout = setTimeout(tick, POLL_MS)
                return
            }

            // Not running. Until the test has actually been seen running, treat
            // "not in progress" as "still starting up" (not "finished") — unless
            // it is taking suspiciously long.
            if (!wasRunning && now - startMs < STARTUP_GRACE_MS) {
                this.loopTimeout = setTimeout(tick, POLL_MS)
                return
            }

            if (finishMs === 0) {
                finishMs = now
            }

            // Normal loop: stop once the max duration has elapsed (checked here,
            // at a test boundary, never mid-test).
            if (options.onExpire && this.expiryMs && now >= this.expiryMs) {
                Logger.I.info("Loop mode expired")
                this.resetTimeout()
                options.onExpire()
                return
            }

            const target = Math.max(startTargetMs, finishMs + MIN_BREAK_MS)
            if (now >= target) {
                MeasurementRunner.I.updateStartTime()
                Logger.I.info("Starting test %d", counter + 1)
                options.onTime(counter + 1)
                return
            }

            // Wait until the next-start target (or the expiry, whichever first).
            const fireAt = this.expiryMs
                ? Math.min(target, this.expiryMs)
                : target
            this.loopTimeout = setTimeout(tick, Math.max(0, fireAt - now))
        }

        // Start polling shortly after the test begins; the tick detects when the
        // test finishes and then waits out the remaining break/interval.
        this.loopTimeout = setTimeout(tick, POLL_MS)

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
