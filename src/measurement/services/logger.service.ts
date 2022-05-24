import fs from "fs"
import path from "path"
import pino from "pino"
import pretty from "pino-pretty"

export class Logger {
    private static instance: pino.Logger

    private constructor() {}

    static get I(): pino.Logger {
        if (!this.instance) {
            const streams: pino.StreamEntry[] = [{ stream: pretty() }]
            if (process.env.LOG_TO_FILE === "true") {
                const logDir = path.join(__dirname, "..", "..", "..", "log")
                if (!fs.existsSync(logDir)) {
                    fs.mkdirSync(logDir)
                }
                streams.push({
                    stream: fs.createWriteStream(
                        path.join(logDir, `${new Date().getTime()}.log`)
                    ),
                })
            }
            this.instance = pino({ level: "info" }, pino.multistream(streams))
        }
        return this.instance
    }
}
