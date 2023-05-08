import { Socket } from "net"
import { IMeasurementRegistrationResponse } from "./measurement-registration-response.interface"
import { IMeasurementThreadResult } from "./measurement-result.interface"

export interface IMessageHandler {
    writeData(): void
    readData(data: Buffer): void
    onFinish(result: any): void
    stopMessaging(): void
}

export interface IMessageHandlerContext {
    bytesPerSecPretest: number[]
    chunkSize: number
    client: Socket
    defaultChunkSize: number
    index: number
    params: IMeasurementRegistrationResponse
    phase?:
        | "init"
        | "predownload"
        | "ping"
        | "download"
        | "preupload"
        | "upload"
    preDownloadChunks: number
    preUploadChunks: number
    threadResult?: IMeasurementThreadResult

    interimHandler?: (interimResult: IMeasurementThreadResult) => void
}
