import { parentPort, workerData } from "worker_threads"
import { IMeasurementThreadResult } from "../interfaces/measurement-result.interface"
import { RMBTThreadService } from "./rmbt-thread.service"

let thread: RMBTThreadService | undefined

export type IncomingMessage =
    | "connect"
    | "download"
    | "ping"
    | "preDownload"
    | "preUpload"
    | "reconnectForUpload"
    | "upload"
export type OutgoingMessage =
    | "connected"
    | "downloadFinished"
    | "pingFinished"
    | "preDownloadFinished"
    | "preUploadFinished"
    | "reconnectedForUpload"
    | "uploadFinished"
export class OutgoingMessageWithData {
    constructor(
        public message: OutgoingMessage,
        public result?: IMeasurementThreadResult,
        public chunks: number = 0
    ) {}
}

parentPort?.on("message", async (message: IncomingMessage) => {
    let result: IMeasurementThreadResult | undefined
    let chunks: number | undefined
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
        case "preDownload":
            chunks = await thread?.managePreDownload()
            parentPort?.postMessage(
                new OutgoingMessageWithData(
                    "preDownloadFinished",
                    undefined,
                    chunks
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
            result = await thread?.manageDownload()
            if (result) {
                result.currentTime = thread?.currentTime || 0n
                result.currentTransfer = thread?.currentTransfer || 0
            }
            parentPort?.postMessage(
                new OutgoingMessageWithData("downloadFinished", result)
            )
            break
        case "preUpload":
            await thread?.connect(workerData.result)
            await thread?.manageInit()
            chunks = await thread?.managePreUpload()
            parentPort?.postMessage(
                new OutgoingMessageWithData(
                    "preUploadFinished",
                    undefined,
                    chunks
                )
            )
            break
        case "reconnectForUpload":
            await thread?.connect(workerData.result)
            await thread?.manageInit()
            parentPort?.postMessage(
                new OutgoingMessageWithData(
                    "reconnectedForUpload",
                    workerData.result
                )
            )
            break
        case "upload":
            result = await thread?.manageUpload()
            if (result) {
                result.currentTime = thread?.currentTime || 0n
                result.currentTransfer = thread?.currentTransfer || 0
            }
            parentPort?.postMessage(
                new OutgoingMessageWithData("uploadFinished", result)
            )
            break
    }
})
