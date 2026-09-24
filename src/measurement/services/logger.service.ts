import fs from "fs"
import os from "os"
import path from "path"
import pino from "pino"
import pretty from "pino-pretty"
import { isMainThread } from "worker_threads"

export class Logger {
    private static instance: pino.Logger

    private constructor() {}

    static get I() {
        return this.instance ?? console
    }

    static mock() {
        this.instance = pino({ enabled: false })
    }

    /**
     * Per-user writable directory for log files (the OS "app data" location).
     * The main process exports its Electron userData path as RMBT_LOG_DIR
     * (see electron.ts), which worker threads inherit; otherwise we derive the
     * same platform-specific app-data path. This module must NOT `require`
     * "electron": it is bundled into the Node-target worker, where requiring the
     * electron npm package pulls in its shim (which self-spawns to "download
     * Electron") and, with process.execPath being the app binary, fork-bombs the
     * app. Never uses the current working directory, which is unwritable ("/")
     * for a launched .app bundle.
     */
    private static get logDir() {
        let base: string | undefined = process.env.RMBT_LOG_DIR
        if (!base) {
            const pack = require("../../../package.json")
            const name = pack.productName || pack.name || "open-rmbt-desktop"
            const home = os.homedir()
            if (process.platform === "win32") {
                base = path.join(
                    process.env.APPDATA || path.join(home, "AppData", "Roaming"),
                    name
                )
            } else if (process.platform === "darwin") {
                base = path.join(home, "Library", "Application Support", name)
            } else {
                base = path.join(
                    process.env.XDG_CONFIG_HOME || path.join(home, ".config"),
                    name
                )
            }
        }
        return path.join(base, "log")
    }

    static init(index?: number) {
        if (!this.instance) {
            const streams: pino.StreamEntry[] = []

            // Runtime CLI overrides (see electron.ts): CLI_LOG_TO_FILE
            // (`--file-log`) and CLI_LOG_TO_CONSOLE (`--console-log`) force
            // logging on for this launch regardless of the LOG_TO_* values
            // baked in at build time by dotenv-webpack. These keys are not in
            // .env, so they stay genuine runtime lookups and can be flipped
            // from the command line.
            const forceConsole = process.env.CLI_LOG_TO_CONSOLE === "true"
            const forceFile = process.env.CLI_LOG_TO_FILE === "true"

            if (isMainThread || process.env.LOG_WORKERS === "true") {
                if (process.env.LOG_TO_CONSOLE === "true" || forceConsole) {
                    streams.push({ stream: pretty() })
                }
                if (process.env.LOG_TO_FILE === "true" || forceFile) {
                    try {
                        const logDir = this.logDir
                        fs.mkdirSync(logDir, { recursive: true })
                        streams.push({
                            stream: fs.createWriteStream(
                                path.join(
                                    logDir,
                                    `${this.formattedTime}${
                                        isMainThread ? "-main" : "-worker"
                                    }${index ?? ""}.log`
                                )
                            ),
                        })
                    } catch (e) {
                        console.error("Could not open log file:", e)
                    }
                }
            }

            if (streams.length) {
                this.instance = pino(
                    {
                        level: "info",
                        timestamp: () => `,"time":"${this.formattedTime}"`,
                    },
                    pino.multistream(streams)
                )
            } else {
                this.instance = pino({ enabled: false })
            }
        }
    }

    private static get formattedTime() {
        return new Date(Date.now()).toISOString().replaceAll(":", "")
    }
}
