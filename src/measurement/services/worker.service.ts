import { parentPort, workerData } from "worker_threads"
import { IMeasurementThreadResult } from "../interfaces/measurement-result.interface"
import {
    IncomingMessageWithData,
    OutgoingMessageWithData,
} from "../interfaces/rmbt-worker.interface"
import { RMBTThread } from "./rmbt-thread.service"

let thread: RMBTThread | undefined

parentPort?.on("message", async (message: IncomingMessageWithData) => {
    let result: IMeasurementThreadResult | undefined
    let chunks: number | undefined = 0
    let isConnected = false
    switch (message.message) {
        case "connect":
            if (!thread) {
                thread = new RMBTThread(workerData.params, workerData.index)
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
            if (result) {
                result.currentTime = thread!.currentTime || 0
                result.currentTransfer = thread!.currentTransfer || 0
            }
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
            await thread?.connect(workerData.result)
            isConnected = (await thread?.manageInit()) || false
            parentPort?.postMessage(
                new OutgoingMessageWithData("reconnectedForUpload", isConnected)
            )
            break
        case "upload":
            thread!.interimHandler = (interimResult) =>
                parentPort?.postMessage(
                    new OutgoingMessageWithData("uploadUpdated", interimResult)
                )
            result = await thread!.manageUpload()
            if (result) {
                result.currentTime = thread?.currentTime || 0
                result.currentTransfer = thread?.currentTransfer || 0
            }
            parentPort?.postMessage(
                new OutgoingMessageWithData("uploadFinished", result)
            )
            break
    }
})
