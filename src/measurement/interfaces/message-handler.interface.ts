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
    currentTime: number
    currentTransfer: number
    defaultChunkSize: number
    index: number
    params: IMeasurementRegistrationResponse
    preDownloadChunks: number
    preUploadChunks: number
    threadResult: IMeasurementThreadResult

    interimHandler?: (interimResult: IMeasurementThreadResult) => void
}
