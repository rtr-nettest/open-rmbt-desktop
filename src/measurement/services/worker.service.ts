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
            await thread.connect(workerData.result)
            isConnected = await thread.manageInit()
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
            await thread?.connect(workerData.result)
            isConnected = (await thread?.manageInit()) || false
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
                await thread?.connect(workerData.result)
                isConnected = (await thread?.manageInit()) || false
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
