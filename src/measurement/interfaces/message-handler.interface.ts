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
    client: Socket
    index: number
    chunksize: number
    params: IMeasurementRegistrationResponse
    threadResult: IMeasurementThreadResult
    preUploadChunks?: number
    preDownloadChunks?: number
}
