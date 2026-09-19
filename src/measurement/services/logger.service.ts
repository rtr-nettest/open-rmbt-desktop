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
     * Uses Electron's userData path in the main process; worker threads (where
     * `electron` is unavailable) fall back to RMBT_LOG_DIR exported by the main
     * process, then to a platform-specific app-data path. Never uses the current
     * working directory, which is unwritable ("/") for a launched .app bundle.
     */
    private static get logDir() {
        let base: string | undefined
        try {
            const { app } = require("electron")
            base = app?.getPath?.("userData")
        } catch {}
        if (!base) base = process.env.RMBT_LOG_DIR
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

            if (isMainThread || process.env.LOG_WORKERS === "true") {
                if (process.env.LOG_TO_CONSOLE === "true") {
                    streams.push({ stream: pretty() })
                }
                if (process.env.LOG_TO_FILE === "true") {
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
