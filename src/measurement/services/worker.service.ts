import { parentPort, workerData } from "worker_threads"
import { IMeasurementThreadResult } from "../interfaces/measurement-result.interface"
import {
    IncomingMessageWithData,
    OutgoingMessageWithData,
} from "../interfaces/rmbt-worker.interface"
import { RMBTThread } from "./rmbt-thread.service"
import { Logger } from "./logger.service"
import { IPreUploadResult } from "./message-handlers/pre-upload-message-handler.service"
import { IMeasurementRegistrationResponse } from "../interfaces/measurement-registration-response.interface"
import { MeasurementThreadResult } from "../dto/measurement-thread-result.dto"

let thread: RMBTThread | undefined
let result: IMeasurementThreadResult | undefined

parentPort?.on("message", async (message: IncomingMessageWithData) => {
    Logger.init(workerData.index)
    let isConnected = false
    switch (message.message) {
        case "connect":
            thread = new RMBTThread(
                message.data as IMeasurementRegistrationResponse,
                workerData.index
            )
            result = new MeasurementThreadResult(workerData.index)
            thread.errorHandler = (error) => {
                error.message = `Thread ${workerData.index} reported an error. ${error.message}`
                parentPort?.postMessage(
                    new OutgoingMessageWithData(
                        "error",
                        workerData.index,
                        error
                    )
                )
            }
            isConnected = await connectRetrying()
            parentPort?.postMessage(
                new OutgoingMessageWithData(
                    "connected",
                    workerData.index,
                    isConnected
                )
            )
            break
        case "disconnect":
            await thread?.disconnect()
            parentPort?.postMessage(
                new OutgoingMessageWithData("disconnected", workerData.index)
            )
            break
        case "preDownload":
            const preDownloadResult = await thread?.managePreDownload()
            parentPort?.postMessage(
                new OutgoingMessageWithData(
                    "preDownloadFinished",
                    workerData.index,
                    preDownloadResult
                )
            )
            break
        case "ping":
            result = await thread?.managePing()
            parentPort?.postMessage(
                new OutgoingMessageWithData(
                    "pingFinished",
                    workerData.index,
                    result
                )
            )
            break
        case "download":
            thread!.interimHandler = (interimResult) =>
                parentPort?.postMessage(
                    new OutgoingMessageWithData(
                        "downloadUpdated",
                        workerData.index,
                        interimResult
                    )
                )
            result = await thread!.manageDownload(message.data as number)
            parentPort?.postMessage(
                new OutgoingMessageWithData(
                    "downloadFinished",
                    workerData.index,
                    result
                )
            )
            break
        case "preUpload":
            isConnected = await connectRetrying()
            let preUpRes: IPreUploadResult | undefined
            if (isConnected) {
                preUpRes = await thread!.managePreUpload()
            }
            parentPort?.postMessage(
                new OutgoingMessageWithData(
                    "preUploadFinished",
                    workerData.index,
                    preUpRes
                )
            )
            break
        case "reconnectForUpload":
            isConnected = thread?.isConnected || false
            if (!isConnected) {
                isConnected = await connectRetrying()
            }
            parentPort?.postMessage(
                new OutgoingMessageWithData(
                    "reconnectedForUpload",
                    workerData.index,
                    isConnected
                )
            )
            break
        case "upload":
            thread!.interimHandler = (interimResult) =>
                parentPort?.postMessage(
                    new OutgoingMessageWithData(
                        "uploadUpdated",
                        workerData.index,
                        interimResult
                    )
                )
            result = await thread!.manageUpload(message.data as number)
            parentPort?.postMessage(
                new OutgoingMessageWithData(
                    "uploadFinished",
                    workerData.index,
                    result
                )
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
                    await thread!.connect(result!)
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
