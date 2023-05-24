import { ELoggerMessage } from "../../enums/logger-message.enum"
import { ESocketMessage } from "../../enums/socket-message.enum"
import {
    IMessageHandler,
    IMessageHandlerContext,
} from "../../interfaces/message-handler.interface"
import { Logger } from "../logger.service"
import { Time } from "../time.service"

export class PreDownloadMessageHandler implements IMessageHandler {
    private messagesPer10Gb = 5 * 1e6
    private preDownloadEndTime = Time.nowNs()
    private preDownloadDuration = 2000000000
    private preDownloadBytesRead = -1
    private isChunkPortionFinished = false
    private chunkMessages: Map<number, string> = new Map()

    constructor(
        private ctx: IMessageHandlerContext,
        public onFinish: () => void
    ) {
        for (let i = 1; i <= this.messagesPer10Gb; i *= 2) {
            this.chunkMessages.set(i, `${ESocketMessage.GETCHUNKS} ${i}\n`)
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
        this.preDownloadBytesRead = 0
        this.ctx.preDownloadChunks = 1
        this.preDownloadEndTime = Time.nowNs() + this.preDownloadDuration
        this.getChunks()
    }

    readData(data: Buffer): void {
        if (data.includes(ESocketMessage.ACCEPT_GETCHUNKS)) {
            if (Time.nowNs() < this.preDownloadEndTime) {
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
                this.preDownloadBytesRead / (timeNs / 1e9)
            )
            return
        }
        let lastByte = 0
        let isFullChunk = false
        if (data.length > 0) {
            this.preDownloadBytesRead =
                this.preDownloadBytesRead + data.byteLength
            isFullChunk = this.preDownloadBytesRead % this.ctx.chunkSize === 0
            lastByte = data[data.length - 1]
        }
        if (isFullChunk && lastByte === 0xff) {
            this.finishChunkPortion()
        }
    }

    private getChunks() {
        Logger.I.info(ELoggerMessage.T_GETTING_CHUNKS, this.ctx.index)
        this.ctx.client.write(
            this.chunkMessages.get(this.ctx.preDownloadChunks)!
        )
        this.isChunkPortionFinished = false
    }

    private finishChunkPortion() {
        if (this.isChunkPortionFinished) {
            return
        }
        Logger.I.info(
            ELoggerMessage.T_SENDING_MESSAGE,
            this.ctx.index,
            ESocketMessage.OK
        )
        this.ctx.client.write(ESocketMessage.OK)
        this.isChunkPortionFinished = true
    }
}
