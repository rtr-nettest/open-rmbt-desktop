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
    private _chunkSize: number = RMBTClient.minChunkSize
    private _maxChunksCount = 16
    private _minChunkSize = 0
    private _preUploadEndTime = Infinity
    private _buffersMap: { [key: string]: Buffer[] } = {}

    get buffersMap() {
        return this._buffersMap
    }

    get chunkSize() {
        return this._chunkSize
    }

    get minChunkSize() {
        return this._minChunkSize
    }

    constructor(
        private ctx: IMessageHandlerContext,
        public onFinish: (_chunkSize: number) => void
    ) {
        for (let i = this._chunkSize; i <= RMBTClient.maxChunkSize; i *= 2) {
            this._buffersMap[i] = this.generateBuffers(i)
        }
    }

    stopMessaging(): void {
        this.onFinish?.(this._chunkSize)
    }

    writeData(): void {
        Logger.I.info(ELoggerMessage.T_SENDING_CHUNKS, this.ctx.index)
        this.ctx.preUploadChunks = 0
        this._preUploadEndTime = Time.nowNs() + 2 * 1e9
        this.putNoResult()
        this.putChunks()
    }

    readData(data: Buffer): void {
        if (data.indexOf(ESocketMessage.ACCEPT_GETCHUNKS) === 0) {
            if (Time.nowNs() >= this._preUploadEndTime) {
                this.stopMessaging()
            } else if (this.ctx.preUploadChunks < this._maxChunksCount) {
                this.putNoResult()
                this.putChunks()
            } else {
                this.putNoResultIncreasingChunkSize()
                this.putChunks()
            }
        }
    }

    private generateBuffers(_chunkSize: number) {
        let maxStoredResults = 3
        const buffers = []
        while (maxStoredResults > 0) {
            buffers.push(randomBytes(_chunkSize))
            maxStoredResults--
        }
        return buffers
    }

    private putNoResult() {
        this.ctx.preUploadChunks =
            !this.ctx.preUploadChunks || this.ctx.preUploadChunks <= 0
                ? 1
                : this.ctx.preUploadChunks * 2
        this._minChunkSize = this.ctx.preUploadChunks * this._chunkSize
        Logger.I.info(
            ELoggerMessage.T_WRITING_PUTNORESULT,
            this.ctx.index,
            ESocketMessage.PUTNORESULT,
            this._chunkSize * this.ctx.preUploadChunks
        )
        this.ctx.client.write(
            `${ESocketMessage.PUTNORESULT} ${
                this._chunkSize * this.ctx.preUploadChunks
            }\n`
        )
    }

    private putNoResultIncreasingChunkSize() {
        this._chunkSize = Math.min(
            RMBTClient.maxChunkSize,
            Math.max(this._minChunkSize * 2, this._chunkSize * 2)
        )
        this.ctx.preUploadChunks = 1
        this._maxChunksCount = 1
        Logger.I.info(
            ELoggerMessage.T_WRITING_PUTNORESULT,
            this.ctx.index,
            ESocketMessage.PUTNORESULT,
            this._chunkSize
        )
        this.ctx.client.write(
            `${ESocketMessage.PUTNORESULT} ${this._chunkSize}\n`
        )
    }

    private putChunks() {
        Logger.I.info(
            ELoggerMessage.T_WRITING_CHUNKS,
            this.ctx.index,
            this.ctx.preUploadChunks
        )
        let bufferIndex = 0
        const buffers = this._buffersMap[this._chunkSize]
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
