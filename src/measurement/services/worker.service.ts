import { parentPort, workerData } from "worker_threads"
import { IMeasurementThreadResult } from "../interfaces/measurement-result.interface"
import {
    IncomingMessageWithData,
    OutgoingMessageWithData,
} from "../interfaces/rmbt-worker.interface"
import { RMBTThread } from "./rmbt-thread.service"
import { Logger } from "./logger.service"
import { IPreUploadResult } from "./message-handlers/pre-upload-message-handler.service"

let thread: RMBTThread | undefined

parentPort?.on("message", async (message: IncomingMessageWithData) => {
    Logger.init(workerData.index)
    let result: IMeasurementThreadResult | undefined
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
            let preUpRes: IPreUploadResult | undefined
            if (isConnected) {
                preUpRes = await thread!.managePreUpload()
            }
            parentPort?.postMessage(
                new OutgoingMessageWithData("preUploadFinished", preUpRes)
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

async function connectRetrying(times = 2): Promise<boolean> {
    let isConnected = false
    let timeout: NodeJS.Timeout
    for (let i = 0; i < times; i++) {
        isConnected = (await Promise.race([
            new Promise(async (resolve) => {
                let connected = false
                try {
                    await thread!.connect(workerData.result)
                    connected = await thread!.manageInit()
                } finally {
                    Logger.I.info("Thread %d is connected.", thread!.index)
                    clearTimeout(timeout)
                    resolve(connected)
                }
            }),
            new Promise((resolve) => {
                timeout = setTimeout(
                    () => {
                        Logger.I.info(
                            "Thread %d is not connected.",
                            thread!.index
                        )
                        resolve(false)
                    },
                    process.env.ALLOWED_INACTIVITY_MS
                        ? parseInt(process.env.ALLOWED_INACTIVITY_MS)
                        : 10000
                )
            }),
        ])) as boolean
        if (isConnected) {
            break
        }
        Logger.I.warn("Socket hang. Reconnecting.")
        await thread!.disconnect()
    }
    return isConnected
}
