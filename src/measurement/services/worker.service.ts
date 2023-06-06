import { parentPort, workerData } from "worker_threads"
import { IMeasurementThreadResult } from "../interfaces/measurement-result.interface"
import {
    IncomingMessageWithData,
    OutgoingMessageWithData,
} from "../interfaces/rmbt-worker.interface"
import { RMBTThread } from "./rmbt-thread.service"
import { Logger } from "./logger.service"

let thread: RMBTThread | undefined

parentPort?.on("message", async (message: IncomingMessageWithData) => {
    Logger.init(workerData.index)
    let result: IMeasurementThreadResult | undefined
    let chunks: number | undefined = 0
    let isConnected = false
    switch (message.message) {
        case "connect":
            if (!thread) {
                thread = new RMBTThread(workerData.params, workerData.index)
                thread.errorHandler = (error) => {
                    error.message = `Thread ${workerData.index} reported an error. ${error.message}`
                    parentPort?.postMessage(
                        new OutgoingMessageWithData("error", error)
                    )
                }
            }
            isConnected = await connectRetrying()
            parentPort?.postMessage(
                new OutgoingMessageWithData("connected", isConnected)
            )
            break
        case "preDownload":
            const preDownloadResult = await thread?.managePreDownload()
            parentPort?.postMessage(
                new OutgoingMessageWithData(
                    "preDownloadFinished",
                    preDownloadResult
                )
            )
            break
        case "ping":
            result = await thread?.managePing()
            parentPort?.postMessage(
                new OutgoingMessageWithData("pingFinished", result)
            )
            break
        case "download":
            thread!.interimHandler = (interimResult) =>
                parentPort?.postMessage(
                    new OutgoingMessageWithData(
                        "downloadUpdated",
                        interimResult
                    )
                )
            result = await thread!.manageDownload(message.data as number)
            parentPort?.postMessage(
                new OutgoingMessageWithData("downloadFinished", result)
            )
            break
        case "preUpload":
            isConnected = await connectRetrying()
            if (isConnected) {
                chunks = await thread?.managePreUpload()
            }
            parentPort?.postMessage(
                new OutgoingMessageWithData("preUploadFinished", chunks)
            )
            break
        case "reconnectForUpload":
            isConnected = thread?.isConnected || false
            if (!isConnected) {
                isConnected = await connectRetrying()
            }
            parentPort?.postMessage(
                new OutgoingMessageWithData("reconnectedForUpload", isConnected)
            )
            break
        case "upload":
            thread!.interimHandler = (interimResult) =>
                parentPort?.postMessage(
                    new OutgoingMessageWithData("uploadUpdated", interimResult)
                )
            result = await thread!.manageUpload(message.data as number)
            parentPort?.postMessage(
                new OutgoingMessageWithData("uploadFinished", result)
            )
            break
    }
})

async function connectRetrying(times = 3): Promise<boolean> {
    let counter = 0
    return new Promise((resolve) => {
        const reconnectInterval = setInterval(async () => {
            await thread?.connect(workerData.result)
            const isConnected = await thread?.manageInit()
            if (isConnected || counter >= times) {
                clearInterval(reconnectInterval)
                resolve(isConnected ?? false)
            } else {
                await thread?.disconnect()
                counter++
            }
        }, 1000)
    })
}
