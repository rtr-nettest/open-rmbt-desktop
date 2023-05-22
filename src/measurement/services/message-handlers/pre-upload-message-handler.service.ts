import { randomBytes } from "crypto"
import { ESocketMessage } from "../../enums/socket-message.enum"
import {
    IMessageHandler,
    IMessageHandlerContext,
} from "../../interfaces/message-handler.interface"
import { Logger } from "../logger.service"
import { RMBTClient } from "../rmbt-client.service"
import { Time } from "../time.service"
import { ELoggerMessage } from "../../enums/logger-message.enum"

export class PreUploadMessageHandler implements IMessageHandler {
    private chunkSize: number = RMBTClient.minChunkSize
    private maxChunksCount = 2
    private preUploadEndTime = Infinity
    private buffersMap: { [key: string]: Buffer[] } = {}
    private chunkSizeReset = false

    constructor(
        private ctx: IMessageHandlerContext,
        public onFinish: (chunkSize: number) => void
    ) {
        for (let i = this.chunkSize; i <= RMBTClient.maxChunkSize; i *= 2) {
            this.buffersMap[i] = this.generateBuffers(i)
        }
    }

    stopMessaging(): void {
        this.onFinish?.(this.chunkSize * this.ctx.preUploadChunks)
    }

    writeData(): void {
        Logger.I.info(ELoggerMessage.T_SENDING_CHUNKS, this.ctx.index)
        this.ctx.preUploadChunks = 0
        this.preUploadEndTime = Time.nowNs() + 2 * 1e9
        this.putNoResult()
        this.putChunks()
    }

    readData(data: Buffer): void {
        if (data.indexOf(ESocketMessage.ACCEPT_GETCHUNKS) === 0) {
            if (Time.nowNs() >= this.preUploadEndTime) {
                this.stopMessaging()
            } else if (this.ctx.preUploadChunks < this.maxChunksCount) {
                this.putNoResult()
                this.putChunks()
            } else {
                this.putNoResultIncreasingChunkSize()
                this.putChunks()
            }
        }
    }

    private generateBuffers(chunkSize: number) {
        let maxStoredResults = 3
        const buffers = []
        while (maxStoredResults > 0) {
            buffers.push(randomBytes(chunkSize))
            maxStoredResults--
        }
        return buffers
    }

    private putNoResult() {
        this.ctx.preUploadChunks =
            !this.ctx.preUploadChunks || this.ctx.preUploadChunks <= 0
                ? 1
                : this.ctx.preUploadChunks * 2
        Logger.I.info(
            ELoggerMessage.T_WRITING_PUTNORESULT,
            this.ctx.index,
            ESocketMessage.PUTNORESULT,
            this.chunkSize
        )
        this.ctx.client.write(
            `${ESocketMessage.PUTNORESULT} ${this.chunkSize}\n`
        )
    }

    private putNoResultIncreasingChunkSize() {
        if (!this.chunkSizeReset) {
            this.chunkSize = this.ctx.client.readableHighWaterMark
            this.ctx.preUploadChunks = 1
            this.chunkSizeReset = true
        } else {
            this.ctx.preUploadChunks = this.ctx.preUploadChunks * 2
        }
        Logger.I.info(
            ELoggerMessage.T_WRITING_PUTNORESULT,
            this.ctx.index,
            ESocketMessage.PUTNORESULT,
            this.chunkSize
        )
        this.ctx.client.write(
            `${ESocketMessage.PUTNORESULT} ${this.chunkSize}\n`
        )
    }

    private putChunks() {
        Logger.I.info(
            ELoggerMessage.T_WRITING_CHUNKS,
            this.ctx.index,
            this.ctx.preUploadChunks
        )
        let bufferIndex = 0
        const buffers = this.buffersMap[this.chunkSize]
        for (let i = 0; i < this.ctx.preUploadChunks; i++) {
            let buffer = buffers[bufferIndex]!
            if (bufferIndex >= buffers.length - 1) {
                bufferIndex = 0
            } else {
                bufferIndex++
            }
            if (i < this.ctx.preUploadChunks - 1) {
                buffer[buffer.length - 1] = 0x00
            } else {
                buffer[buffer.length - 1] = 0xff
            }
            this.ctx.client.write(buffer)
        }
        Logger.I.info(ELoggerMessage.T_FINISHED_SENDING_CHUNKS, this.ctx.index)
    }
}
