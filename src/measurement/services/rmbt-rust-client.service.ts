import { spawn, spawnSync } from "child_process"
import { existsSync } from "fs"
import { EMeasurementStatus } from "../enums/measurement-status.enum"
import { IMeasurementRegistrationResponse } from "../interfaces/measurement-registration-response.interface"
import {
    IMeasurementThreadResult,
    IPing,
} from "../interfaces/measurement-result.interface"
import { Logger } from "./logger.service"
import { Time } from "./time.service"
import { NetworkInfoService } from "./network-info.service"
import { IOverallResult } from "../interfaces/overall-result.interface"
import { MeasurementRunner } from ".."
import { UserSettingsRequest } from "../dto/user-settings-request.dto"
import { MeasurementOptions } from "../interfaces/measurement-options.interface"
import { IRMBTClient } from "../interfaces/rmbt-client.interface"
import path from "path"
import { ControlServer } from "./control-server.service"
import { ACTIVE_SERVER, Store } from "./store.service"

const packJson = require("../../../package.json")

export type TransferDirection = "down" | "up"

export class RMBTRustClient implements IRMBTClient {
    /** Subdirectory (next to dist/main.js) holding this engine's native binary. */
    protected clientDir = "rust_client"
    /** Human-readable engine name, used only in log messages. */
    protected clientLabel = "Rust"

    /**
     * Absolute path to a bundled native client binary. `dir` selects the engine
     * (e.g. "rust_client", "c_client"); webpack copies src/measurement/<dir> ->
     * dist/<dir>, so __dirname resolves it in dev and production.
     */
    static binaryPath(dir = "rust_client"): string {
        const exeName =
            process.platform === "win32" ? "rmbt-client.exe" : "rmbt-client"
        return path.join(__dirname, dir, exeName)
    }

    /**
     * Path to the executable this instance spawns. Overridable so subclasses
     * with a different on-disk layout (e.g. the Java jpackage app-image) can
     * point elsewhere while reusing the rest of the spawn/parse logic.
     */
    protected getBinaryPath(): string {
        return RMBTRustClient.binaryPath(this.clientDir)
    }

    /**
     * Whether the native client in `dir` can actually run on this machine.
     * Returns false if the binary for this platform/architecture is not bundled
     * or fails to execute (e.g. wrong arch / missing libs / no build for this OS)
     * — the caller then falls back to the built-in JavaScript engine.
     */
    static isAvailable(dir = "rust_client"): boolean {
        try {
            const bin = RMBTRustClient.binaryPath(dir)
            if (!existsSync(bin)) {
                Logger.I.warn(`Native client binary not bundled at ${bin}`)
                return false
            }
            // Probe: `--help` runs without network and exits 0 on a working binary.
            const res = spawnSync(bin, ["--help"], { timeout: 5000 })
            if (res.error || res.status !== 0) {
                Logger.I.warn(
                    `Native client probe failed (${res.error?.message ?? "exit " + res.status})`,
                )
                return false
            }
            return true
        } catch (e) {
            Logger.I.warn("Native client availability check threw: " + e)
            return false
        }
    }

    finalResultDown?: IOverallResult
    finalResultUp?: IOverallResult
    measurementLastUpdate?: number
    measurementStatus: EMeasurementStatus = EMeasurementStatus.WAIT
    params: IMeasurementRegistrationResponse
    initializedThreads: number[] = []
    interimThreadResults: IMeasurementThreadResult[] = []
    threadResults: IMeasurementThreadResult[] = []
    chunks: number[] = []
    timestamps: { index: number; time: number }[] = []
    pingMedian = -1
    measurementStart: number = 0
    isRunning = false
    activityInterval?: NodeJS.Timeout
    aborter = new AbortController()
    pings: IPing[] = []
    downs: IOverallResult[] = []
    ups: IOverallResult[] = []
    lastMessageReceivedAt = Date.now()
    private estimatePhaseDuration: { [key: string]: number } = {
        [EMeasurementStatus.INIT]: 0.5,
        [EMeasurementStatus.INIT_DOWN]: 2.5,
        [EMeasurementStatus.PING]: 1.5,
        [EMeasurementStatus.DOWN]: -1,
        [EMeasurementStatus.INIT_UP]: 5,
        [EMeasurementStatus.UP]: -1,
    }
    private phaseStartTimeNs: { [key: string]: number } = {
        [EMeasurementStatus.INIT]: -1,
        [EMeasurementStatus.INIT_DOWN]: -1,
        [EMeasurementStatus.PING]: -1,
        [EMeasurementStatus.DOWN]: -1,
        [EMeasurementStatus.INIT_UP]: -1,
        [EMeasurementStatus.UP]: -1,
    }

    private _interimDownMbps = 0
    private _interimUpMbps = 0
    private _testUuid = ""

    get interimDownMbps() {
        return this._interimDownMbps
    }

    get interimUpMbps() {
        return this._interimUpMbps
    }

    setInterimDownMbpsFromValue(value: number) {
        this._interimDownMbps = value
    }

    setInterimUpMbpsFromValue(val) {
        this._interimUpMbps = val
    }

    // should return final val from java
    get finalDownMbps() {
        return (this.finalResultDown?.speed ?? 0) / 1e6
    }

    // should return final val from java
    get finalUpMbps() {
        return (this.finalResultUp?.speed ?? 0) / 1e6
    }

    constructor(clientDir = "rust_client", clientLabel = "Rust") {
        this.clientDir = clientDir
        this.clientLabel = clientLabel
        this.params = {
            test_duration: 7,
        } as any

        this.estimatePhaseDuration[EMeasurementStatus.DOWN] = Number(
            this.params.test_duration,
        )
        this.estimatePhaseDuration[EMeasurementStatus.UP] = Number(
            this.params.test_duration,
        )
    }

    getTestUuid() {
        return this._testUuid
    }

    getPhaseDuration(phase: string) {
        return (Time.nowNs() - this.phaseStartTimeNs[phase]) / 1e9
    }

    getPhaseProgress(phase: string) {
        const estimatePhaseDuration = this.estimatePhaseDuration[phase] ?? -1
        return Math.min(1, this.getPhaseDuration(phase) / estimatePhaseDuration)
    }

    // Measurement phases in the order they occur. advanceToPhase() uses this to
    // keep transitions monotonic.
    private static readonly PHASE_SEQUENCE: EMeasurementStatus[] = [
        EMeasurementStatus.NOT_STARTED,
        EMeasurementStatus.WAIT,
        EMeasurementStatus.INIT,
        EMeasurementStatus.INIT_DOWN,
        EMeasurementStatus.PING,
        EMeasurementStatus.DOWN,
        EMeasurementStatus.INIT_UP,
        EMeasurementStatus.UP,
        EMeasurementStatus.SUBMITTING_RESULTS,
        EMeasurementStatus.END,
    ]

    /**
     * Move the measurement forward to `phase`, recording its start time once.
     * Transitions to the current or an earlier phase are ignored, so the phase —
     * and the progress gauge derived from phaseStartTimeNs — never steps back.
     * In particular this stops the INIT→INIT_DOWN fallback timer from resetting
     * INIT_DOWN after the engine has already entered it (which made the init
     * gauge jump up, back down, then up again).
     */
    private advanceToPhase(phase: EMeasurementStatus) {
        const seq = RMBTRustClient.PHASE_SEQUENCE
        if (seq.indexOf(phase) <= seq.indexOf(this.measurementStatus)) {
            return
        }
        this.measurementStatus = phase
        this.phaseStartTimeNs[phase] = Time.nowNs()
    }

    async scheduleMeasurement(
        options?: MeasurementOptions,
    ): Promise<IMeasurementThreadResult[]> {
        Logger.I.info("Running measurement via external client...")
        this.measurementLastUpdate = new Date().getTime()
        return this.runMeasurement(options)
    }

    abortMeasurement() {
        this.aborter.abort()
    }

    private cancelMeasurement(reject: Function, error?: Error) {
        if (!this.isRunning) {
            return
        }
        clearInterval(this.activityInterval)
        this.threadResults = []
        this.isRunning = false

        if (error) {
            Logger.I.error(error)
            this.measurementStatus = EMeasurementStatus.ERROR
            reject(error)
        } else {
            this.measurementStatus = EMeasurementStatus.ABORTED
            reject(null)
        }
    }

    private async runMeasurement(
        options?: MeasurementOptions,
    ): Promise<IMeasurementThreadResult[]> {
        // main method to spawn client
        this.isRunning = true
        this.measurementStart = Date.now()

        // Check network interface to pass to cli
        let networkType = await NetworkInfoService.I.getNetworkType()
        Logger.I.info("Network type is: " + networkType.toString)

        const host = await ControlServer.I.getHost()

        Logger.I.info("Control server host is: " + host)

        return new Promise((resolve, reject) => {
            let platform = process.platform.toLowerCase()
            let settingsRequest = new UserSettingsRequest({ platform })

            Logger.I.info("Running measurementx...")

            // set the state to INIT =================================================================
            // CORRECT STATE PROGRESSION:
            // NOT_STARTED --> INIT --> INIT_DOWN --> PING --> DOWN --> INIT_UP --> UP --> SUBMITTING_RESULTS --> END
            this.advanceToPhase(EMeasurementStatus.INIT)

            // spawn process =========================================================================
            Logger.I.info("Spawning external process...")

            // Native client binary (no Java runtime). Availability is pre-checked
            // in MeasurementRunner.setRMBTClient (with JS fallback).
            const binary_path = this.getBinaryPath()

            let bin_options = [
                "-h",
                host.replace("https://", "").replace("http://", ""),
                "-p",
                "443",
                "--platform",
                settingsRequest.platform || "", // Darwin
                "--os",
                settingsRequest.operating_system || "", // Darwin, 24.1.0
                "--model",
                settingsRequest.model || "", // Desktop_arm64
                "--osver",
                settingsRequest.os_version || "", // 24.1.0
                "--type",
                settingsRequest.type.toString(), // DESKTOP
                "--nettype",
                networkType.toString(),
                "-set-version",
                packJson.version,
                "-v",
            ]

            // pass loop mode parameters
            if (options?.loopModeInfo) {
                Logger.I.info("Loop mode enabled, loop mode info start")
                Logger.I.info(options)
                Logger.I.info("Loop mode info end")
                bin_options.push("--user-loop-mode")
                bin_options.push(
                    "--user-loop-mode-max-delay",
                    options?.loopModeInfo?.max_delay,
                )
                bin_options.push(
                    "--user-loop-mode-test-counter",
                    options?.loopModeInfo?.test_counter,
                )
                // Only pass the loop UUID once it is known. On the first iteration
                // it is omitted so the control server mints one, which we then read
                // back from the client's UUID_INFO message.
                if (options?.loopModeInfo?.loop_uuid) {
                    bin_options.push(
                        "--user-loop-mode-uuid",
                        options.loopModeInfo.loop_uuid,
                    )
                }
            }

            // get the uuid from settings and push it to java options array
            // this is done here, so if uuid is not known, measurement will still proceed with java uuid
            let user_uuid = MeasurementRunner.I.settings?.uuid
            Logger.I.info("My uuid is " + user_uuid)
            if (user_uuid && user_uuid != "") {
                bin_options.push("-u")
                bin_options.push(user_uuid)
            }

            // Custom test-server selection: forward the chosen server's UUID so
            // the native client requests it from the control server
            // (prefer_server / user_server_selection). Absent when "Default
            // server" is selected (ACTIVE_SERVER cleared) → server auto-assigned.
            const activeServer = Store.I.get(ACTIVE_SERVER) as {
                uuid?: string
            } | null
            if (activeServer?.uuid) {
                Logger.I.info(
                    "Preferred server uuid is " + activeServer.uuid,
                )
                bin_options.push("--server_uuid")
                bin_options.push(activeServer.uuid)
            }

            var child
            // spawn the native Rust client directly (no `java -jar`)
            Logger.I.info([binary_path, ...bin_options])
            child = spawn(binary_path, bin_options)
            child.stdout.setEncoding("utf8")

            // assemble outpu data chunks and split them on newlines
            let outData = ""
            child.stdout.on("data", (chunk) => {
                outData += chunk // accumulate data chunks
                let lines = outData.split("\n") // split the accumulated data by newlines
                // save the last partial line (if any) for the next chunk
                outData = lines.pop() ?? ""

                // print each complete line
                lines.forEach((line) => {
                    // get line from rechunked process stdout

                    Logger.I.info("   ====> LINE: " + line)
                    if (line.startsWith("{")) {
                        Logger.I.info("   -------> JSON: " + line)
                        this.parseMessageFromJava(line.trim())
                    }
                    if (line.startsWith("ENDING TEST.")) {
                        Logger.I.info("   -------> ENGINENo DONE")
                        this.WrapUp()
                    }

                    this.lastMessageReceivedAt = Date.now()
                })
            })
            child.stdout.on("end", () => {
                // Print any remaining data after the stream ends
                if (outData) {
                    Logger.I.info(outData)
                }
            })

            // Handle phase transitions ================================================================
            setTimeout(() => {
                // Fallback INIT → INIT_DOWN transition in case the engine hasn't
                // emitted a state change yet. advanceToPhase() makes this a no-op
                // once the engine has already moved on, so it can't reset the
                // phase start and make the progress gauge jump backwards.
                this.advanceToPhase(EMeasurementStatus.INIT_DOWN)
            }, 1000)

            let allowedInactivityMs = Number(process.env.ALLOWED_INACTIVITY_MS)
            if (isNaN(allowedInactivityMs)) {
                allowedInactivityMs = 10000
            }
            this.activityInterval = setInterval(() => {
                if (
                    Date.now() - this.lastMessageReceivedAt >=
                    allowedInactivityMs
                ) {
                    this.cancelMeasurement(
                        reject,
                        new Error("Measurement timed out"),
                    )
                }
            }, allowedInactivityMs)

            // handle java errors and exit codes
            child.on("close", (code) => {
                Logger.I.info(`${this.clientLabel} client process exited with code ${code}`)
                if (code === 0) {
                    child = null
                    resolve([])
                } else {
                    this.measurementStatus = EMeasurementStatus.ERROR
                    reject(
                        new Error(
                            `${this.clientLabel} client process exited with code ${code}`,
                        ),
                    )
                }
            })

            child.on("error", (err) => {
                Logger.I.error(`Failed to start ${this.clientLabel} client process:`, err)
                this.measurementStatus = EMeasurementStatus.ERROR
                reject(err)
            })

            const timeout = setTimeout(() => {
                Logger.I.error("Measurement timed out")
                if (child !== null) {
                    Logger.I.error("Child process is not null")
                    child.kill()
                    this.measurementStatus = EMeasurementStatus.ABORTED
                    reject(new Error("Measurement timed out"))
                }
            }, 300000)

            this.aborter.signal.addEventListener("abort", () => {
                clearTimeout(timeout)
                child.kill()
                this.measurementStatus = EMeasurementStatus.ABORTED
                this.isRunning = false
                resolve([])
            })
        })
    }

    interimDownInterval?: NodeJS.Timeout
    interimUpInterval?: NodeJS.Timeout

    private parseMessageFromJava(strMessage: string) {
        if (strMessage.startsWith("{") && strMessage.endsWith("}")) {
            try {
                var parsed_data = JSON.parse(strMessage)

                if (
                    parsed_data["type"] == "UUID_INFO" &&
                    parsed_data["testUuid"]
                ) {
                    this._testUuid = parsed_data["testUuid"]
                    this.params.test_uuid = parsed_data["testUuid"]
                    // Server loop UUID minted on the first loop iteration; the
                    // runner reads it from params and reuses it for the rest.
                    if (parsed_data["loopUuid"]) {
                        this.params.loop_uuid = parsed_data["loopUuid"]
                        Logger.I.info(
                            `[loop uuid] captured from UUID_INFO: ${parsed_data["loopUuid"]}`,
                        )
                    } else {
                        // DEBUG: diagnose missing loop UUID. The desktop relies on
                        // the engine/server to mint and return it here; if it is
                        // absent, loop grouping/navigation cannot work.
                        Logger.I.info(
                            `[loop uuid] UUID_INFO has NO loopUuid field — keys present: ${Object.keys(
                                parsed_data,
                            ).join(", ")}`,
                        )
                    }
                } else if (parsed_data["type"] == "STATE_CHANGE") {
                    switch (parsed_data["state"]) {
                        case "NOT_STARTED":
                            break
                        case "WAIT":
                            break
                        case "INIT":
                            break
                        case "PING":
                            this.advanceToPhase(EMeasurementStatus.PING)
                            break
                        case "INIT_DOWN":
                            this.advanceToPhase(EMeasurementStatus.INIT_DOWN)
                            break
                        case "DOWN":
                            this.advanceToPhase(EMeasurementStatus.DOWN)
                            break
                        case "INIT_UP":
                            this.advanceToPhase(EMeasurementStatus.INIT_UP)
                            break
                        case "UP":
                            this.advanceToPhase(EMeasurementStatus.UP)
                            break
                        case "SUBMITTING_RESULTS":
                            break
                        case "SPEEDTEST_END":
                            break
                        case "QOS_TEST_RUNNING":
                            break
                        case "SUBMITTING_QOS_RESULTS":
                            break
                        case "QOS_END":
                            break
                        case "END":
                            break
                        case "ERROR":
                            break
                        case "ABORTED":
                            break
                    }
                } else if (parsed_data["type"] == "PING_RESULT") {
                    this.pingMedian =
                        (this.pingMedian * this.pings.length +
                            parsed_data["pingServer"]) /
                        (this.pings.length + 1)
                    this.pings.push({
                        value: parsed_data["pingClient"] * 1e6,
                        value_server: parsed_data["pingServer"] * 1e6,
                        time_ns: parsed_data["pingTimeNs"],
                    })
                } else if (parsed_data["type"] == "DOWNLOAD_RESULT") {
                    // save speed into this.downs for chart persistence;
                    // we don't have accurate time, so measure the time
                    let delta_t =
                        Time.nowNs() -
                        this.phaseStartTimeNs[EMeasurementStatus.DOWN]
                    this.downs.push({
                        bytes: parsed_data["bytes"],
                        nsec: delta_t,
                        // Network speed is decimal: 1 Mbit/s = 1000 * 1000 bit/s.
                        // (Using 1024*1024 inflated every displayed speed by ~2.4%.)
                        speed: parsed_data["down"] * 1000 * 1000,
                    })

                    this.setInterimDownMbpsFromValue(parsed_data["down"])
                    // DEBUG: raw rate reported by the Rust client vs what we store.
                    Logger.I.info(
                        `[Rust rate] DOWNLOAD_RESULT down=${parsed_data["down"]} Mbit/s bytes=${parsed_data["bytes"]} -> interimDownMbps=${this.interimDownMbps}`,
                    )
                } else if (parsed_data["type"] == "UPLOAD_RESULT") {
                    // save speed into this.ups for chart persistence;
                    // we don't have accurate time, so measure the time
                    let delta_t =
                        Time.nowNs() -
                        this.phaseStartTimeNs[EMeasurementStatus.UP]
                    this.ups.push({
                        bytes: parsed_data["bytes"],
                        nsec: delta_t,
                        // Network speed is decimal: 1 Mbit/s = 1000 * 1000 bit/s.
                        // (Using 1024*1024 inflated every displayed speed by ~2.4%.)
                        speed: parsed_data["up"] * 1000 * 1000,
                    })

                    this.setInterimUpMbpsFromValue(parsed_data["up"])
                    // DEBUG: raw rate reported by the Rust client vs what we store.
                    Logger.I.info(
                        `[Rust rate] UPLOAD_RESULT up=${parsed_data["up"]} Mbit/s bytes=${parsed_data["bytes"]} -> interimUpMbps=${this.interimUpMbps}`,
                    )
                } else {
                    // DEBUG: any message type we don't handle — this is where a
                    // final/overall result (the authoritative rate) would hide.
                    Logger.I.info(`[Rust raw unhandled] ${strMessage}`)
                }
            } catch (error) {
                Logger.I.error(error)
            }
        }
    }

    private async WrapUp() {
        Logger.I.info("Wrapping up")
        // DEBUG: the final rates the UI will display (interim = last reported
        // sample; final = 0 unless finalResultDown/Up were set).
        Logger.I.info(
            `[Rust rate] WrapUp final down/up the UI shows: interimDownMbps=${this.interimDownMbps} interimUpMbps=${this.interimUpMbps} finalDownMbps=${this.finalDownMbps} finalUpMbps=${this.finalUpMbps}`,
        )
        Logger.I.info("running status:")
        Logger.I.info(this.isRunning)
        this.isRunning = false
        Logger.I.info("running status:")
        Logger.I.info(this.isRunning)
        Logger.I.info("state is:")
        Logger.I.info(this.measurementStatus)

        clearInterval(this.activityInterval)

        setTimeout(() => {
            Logger.I.info("SETTING STATE TO SUBMITTING_RESULTS")
            this.measurementStatus = EMeasurementStatus.SUBMITTING_RESULTS
            this.phaseStartTimeNs[EMeasurementStatus.SUBMITTING_RESULTS] =
                Time.nowNs()
        }, 100)

        setTimeout(() => {
            Logger.I.info("SETTING STATE TO END")
            this.measurementStatus = EMeasurementStatus.END
            this.phaseStartTimeNs[EMeasurementStatus.END] = Time.nowNs()
        }, 1000)
    }
}
