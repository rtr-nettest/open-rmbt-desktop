import { RMBTWorker } from "../interfaces/rmbt-worker.interface"
import { Window } from "../interfaces/window.interface"

export class RMBTWorkerFactory {
    private constructor() {}

    public static getWorker(
        filename: string,
        options?: { workerData: { [key: string]: any } }
    ): RMBTWorker | undefined {
        const window = globalThis as Window
        if (typeof window.Worker != "undefined") {
            return new window.Worker(filename, options)
        }
        try {
            const { Worker } = require("worker_threads")
            return new Worker(filename, options)
        } catch (e) {
            return undefined
        }
    }
}
