import { ELoggerMessage } from "../../enums/logger-message.enum"
import { ESocketMessage } from "../../enums/socket-message.enum"
import {
    IMessageHandler,
    IMessageHandlerContext,
} from "../../interfaces/message-handler.interface"
import { Logger } from "../logger.service"
import { Time } from "../time.service"

export class PreDownloadMessageHandler implements IMessageHandler {
    private _messagesPer10Gb = 5 * 1e6
    private _preDownloadEndTime = Time.nowNs()
    private _preDownloadDuration = 2000000000
    private _preDownloadBytesRead = 0
    private _isChunkPortionFinished = false
    private _chunkMessages: { [key: number]: string } = {}

    get preDownloadEndTime() {
        return this._preDownloadEndTime
    }

    get preDownloadDuration() {
        return this._preDownloadDuration
    }

    get preDownloadBytesRead() {
        return this._preDownloadBytesRead
    }

    get isChunkPortionFinished() {
        return this._isChunkPortionFinished
    }

    get chunkMessages() {
        return this._chunkMessages
    }

    constructor(
        private ctx: IMessageHandlerContext,
        public onFinish: () => void
    ) {
        for (let i = 1; i <= this._messagesPer10Gb; i *= 2) {
            this._chunkMessages[i] = `${ESocketMessage.GETCHUNKS} ${i}\n`
        }
    }

    stopMessaging(): void {
        Logger.I.info(
            ELoggerMessage.T_PHASE_FINISHED,
            this.ctx.phase,
            this.ctx.index
        )
        this.onFinish?.()
    }

    writeData(): void {
        this._preDownloadBytesRead = 0
        this.ctx.preDownloadChunks = 1
        this._preDownloadEndTime = Time.nowNs() + this._preDownloadDuration
        this.getChunks()
    }

    readData(data: Buffer): void {
        if (data.includes(ESocketMessage.ACCEPT_GETCHUNKS)) {
            if (Time.nowNs() < this._preDownloadEndTime) {
                this.ctx.preDownloadChunks *= 2
                this.getChunks()
            } else {
                this.stopMessaging()
            }
            return
        }
        if (data.indexOf(ESocketMessage.TIME) === 0) {
            const timeNs = Number(data.slice(5))
            this.ctx.bytesPerSecPretest.push(
                this._preDownloadBytesRead / (timeNs / 1e9)
            )
            return
        }
        let lastByte = 0
        let isFullChunk = false
        if (data.length > 0) {
            this._preDownloadBytesRead =
                this._preDownloadBytesRead + data.byteLength
            isFullChunk = this._preDownloadBytesRead % this.ctx.chunkSize === 0
            lastByte = data[data.length - 1]
        }
        if (isFullChunk && lastByte === 0xff) {
            this.finishChunkPortion()
        }
    }

    private getChunks() {
        Logger.I.info(ELoggerMessage.T_GETTING_CHUNKS, this.ctx.index)
        this.ctx.client.write(this._chunkMessages[this.ctx.preDownloadChunks]!)
        this._isChunkPortionFinished = false
    }

    private finishChunkPortion() {
        if (this._isChunkPortionFinished) {
            return
        }
        Logger.I.info(
            ELoggerMessage.T_SENDING_MESSAGE,
            this.ctx.index,
            ESocketMessage.OK
        )
        this.ctx.client.write(ESocketMessage.OK)
        this._isChunkPortionFinished = true
    }
}
