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
        public data?: IMeasurementThreadResult | number | bigint
    ) {}
}
export class IncomingMessageWithData {
    constructor(public message: IncomingMessage, public data?: bigint) {}
}

parentPort?.on("message", async (message: IncomingMessageWithData) => {
    let result: IMeasurementThreadResult | undefined
    let chunks: number | undefined
    switch (message.message) {
        case "connect":
            if (!thread) {
                thread = new RMBTThreadService(
                    workerData.params,
                    workerData.index
                )
            }
            await thread.connect(workerData.result)
            await thread.manageInit()
            parentPort?.postMessage(
                new OutgoingMessageWithData("connected", workerData.result)
            )
            break
        case "preDownload":
            chunks = await thread?.managePreDownload()
            parentPort?.postMessage(
                new OutgoingMessageWithData("preDownloadFinished", chunks)
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
                new OutgoingMessageWithData("preUploadFinished", chunks)
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
