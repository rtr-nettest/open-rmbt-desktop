import fs from "fs"
import path from "path"
import pino from "pino"
import pretty from "pino-pretty"
import { isMainThread } from "worker_threads"

export class Logger {
    private static instance: pino.Logger

    private constructor() {}

    static get I(): pino.Logger {
        if (!this.instance) {
            const streams: pino.StreamEntry[] = []

            if (isMainThread || process.env.LOG_WORKERS === "true") {
                if (process.env.LOG_TO_CONSOLE === "true") {
                    streams.push({ stream: pretty() })
                } else {
                    console.log("Logging to console is disabled.")
                }
                if (process.env.LOG_TO_FILE === "true") {
                    const logDir = path.join(__dirname, "..", "..", "..", "log")
                    if (!fs.existsSync(logDir)) {
                        fs.mkdirSync(logDir)
                    }
                    streams.push({
                        stream: fs.createWriteStream(
                            path.join(
                                logDir,
                                `${new Date().getTime()}${
                                    isMainThread ? "-main" : "-worker"
                                }.log`
                            )
                        ),
                    })
                } else {
                    console.log("Logging to file is disabled.")
                }
            }

            if (streams.length) {
                this.instance = pino(
                    { level: "info" },
                    pino.multistream(streams)
                )
            } else {
                this.instance = pino({ enabled: false })
            }
        }
        return this.instance
    }
}
