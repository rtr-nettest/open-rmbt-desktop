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
    | "startRandomGenerator"
export type OutgoingMessage =
    | "connected"
    | "downloadFinished"
    | "pingFinished"
    | "preDownloadFinished"
    | "preUploadFinished"
    | "reconnectedForUpload"
    | "uploadFinished"
    | "bufferGenerated"
export class OutgoingMessageWithData {
    constructor(
        public message: OutgoingMessage,
        public data?: IMeasurementThreadResult | number | boolean | IBuffer
    ) {}
}
export class IncomingMessageWithData {
    constructor(public message: IncomingMessage, public data?: number) {}
}
export interface IBuffer {
    index: number
    buffer: Buffer
}
