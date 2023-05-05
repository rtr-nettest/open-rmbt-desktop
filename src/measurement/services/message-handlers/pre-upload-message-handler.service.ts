import { randomBytes } from "crypto"
import { ESocketMessage } from "../../enums/socket-message.enum"
import {
    IMessageHandler,
    IMessageHandlerContext,
} from "../../interfaces/message-handler.interface"
import { Logger } from "../logger.service"
import { RMBTClient } from "../rmbt-client.service"
import { Time } from "../time.service"

export class PreUploadMessageHandler implements IMessageHandler {
    private chunkSize: number = RMBTClient.minChunkSize
    private maxChunksCount = 16
    private minChunkSize = 0
    private preUploadEndTime = Infinity
    private buffersMap: { [key: string]: Buffer[] } = {}

    constructor(
        private ctx: IMessageHandlerContext,
        public onFinish: (chunkSize: number) => void
    ) {
        for (let i = this.chunkSize; i <= RMBTClient.maxChunkSize; i *= 2) {
            this.buffersMap[i] = this.generateBuffers(i)
        }
    }

    stopMessaging(): void {
        this.onFinish?.(this.chunkSize)
    }

    writeData(): void {
        Logger.I.info("Thread %d starts sending chunks.", this.ctx.index)
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
        this.minChunkSize = this.ctx.preUploadChunks * this.chunkSize
        Logger.I.info(
            "Thread %d is writing %s %d.",
            this.ctx.index,
            ESocketMessage.PUTNORESULT,
            this.chunkSize * this.ctx.preUploadChunks
        )
        this.ctx.client.write(
            `${ESocketMessage.PUTNORESULT} ${
                this.chunkSize * this.ctx.preUploadChunks
            }\n`
        )
    }

    private putNoResultIncreasingChunkSize() {
        this.chunkSize = Math.min(
            RMBTClient.maxChunkSize,
            Math.max(this.minChunkSize * 2, this.chunkSize * 2)
        )
        this.ctx.preUploadChunks = 1
        this.maxChunksCount = 1
        Logger.I.info(
            "Thread %d is writing %s $%d.",
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
            "Thread %d is putting %d chunks.",
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
        Logger.I.info("Thread %d has finished putting chunks.", this.ctx.index)
    }
}
