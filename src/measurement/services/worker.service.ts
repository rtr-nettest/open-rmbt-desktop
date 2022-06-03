import { parentPort, workerData } from "worker_threads"
import { Logger } from "./logger.service"
import { RMBTThreadService } from "./rmbt-thread.service"

let thread: RMBTThreadService | undefined

parentPort?.on("message", async (message) => {
    switch (message) {
        case "connect":
            if (!thread) {
                thread = new RMBTThreadService(
                    workerData.params,
                    workerData.index
                )
            }
            await thread.connect(workerData.result)
            await thread.manageInit()
            parentPort?.postMessage({ message: "connected" })
            break
        case "upload":
            const result = await thread?.manageDownload()
            if (result) {
                result!.currentTime = thread?.currentTime
                result!.currentTransfer = thread?.currentTransfer
                parentPort?.postMessage({
                    message: "uploadFinished",
                    result,
                })
            }
            break
    }
})
