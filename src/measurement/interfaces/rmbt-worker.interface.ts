import { IPreUploadResult } from "../services/message-handlers/pre-upload-message-handler.service"
import { IPreDownloadResult } from "../services/rmbt-thread.service"
import { IMeasurementThreadResult } from "./measurement-result.interface"

export interface RMBTWorker {
    postMessage(value: IncomingMessageWithData): void
    terminate(): void
    on(
        event: "message",
        listener: (value: OutgoingMessageWithData) => void
    ): void
}

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
    | "downloadUpdated"
    | "downloadFinished"
    | "pingFinished"
    | "preDownloadFinished"
    | "preUploadFinished"
    | "reconnectedForUpload"
    | "uploadUpdated"
    | "uploadFinished"
    | "error"
export class OutgoingMessageWithData {
    constructor(
        public message: OutgoingMessage,
        public data?:
            | IMeasurementThreadResult
            | number
            | boolean
            | IBuffer
            | IPreDownloadResult
            | IPreUploadResult
            | Error
    ) {}
}
export class IncomingMessageWithData {
    constructor(
        public message: IncomingMessage,
        public data?: number | Buffer
    ) {}
}
export interface IBuffer {
    index: number
    buffer: Buffer
}
