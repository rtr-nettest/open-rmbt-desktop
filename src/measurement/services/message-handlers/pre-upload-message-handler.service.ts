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
    private maxChunksCount = 8
    private minChunkSize = 0
    private preUploadEndTime = Infinity
    private buffersMap: { [key: string]: Buffer[] } = {}

    constructor(
        private ctx: IMessageHandlerContext,
        public onFinish: () => void
    ) {
        for (let i = this.ctx.chunkSize; i <= RMBTClient.maxChunkSize; i *= 2) {
            this.buffersMap[i] = this.generateBuffers(i)
        }
    }

    stopMessaging(): void {
        this.onFinish?.()
    }

    writeData(): void {
        Logger.I.info(`Thread ${this.ctx.index} starts sending chunks.`)
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
            } else if (this.ctx.chunkSize < RMBTClient.maxChunkSize) {
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
        this.minChunkSize = this.ctx.preUploadChunks * this.ctx.chunkSize
        Logger.I.info(
            `Thread ${this.ctx.index} is writing ${
                ESocketMessage.PUTNORESULT
            } ${this.ctx.chunkSize * this.ctx.preUploadChunks}.`
        )
        this.ctx.client.write(
            `${ESocketMessage.PUTNORESULT} ${
                this.ctx.chunkSize * this.ctx.preUploadChunks
            }\n`
        )
    }

    private putNoResultIncreasingChunkSize() {
        this.ctx.chunkSize = Math.min(
            RMBTClient.maxChunkSize,
            Math.max(this.minChunkSize * 2, this.ctx.chunkSize * 2)
        )
        this.ctx.preUploadChunks = 1
        this.maxChunksCount = 1
        Logger.I.info(
            `Thread ${this.ctx.index} is writing ${ESocketMessage.PUTNORESULT} ${this.ctx.chunkSize}.`
        )
        this.ctx.client.write(
            `${ESocketMessage.PUTNORESULT} ${this.ctx.chunkSize}\n`
        )
    }

    private putChunks() {
        Logger.I.info(
            `Thread ${this.ctx.index} is putting ${this.ctx.preUploadChunks} chunks.`
        )
        let bufferIndex = 0
        const buffers = this.buffersMap[this.ctx.chunkSize]
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
        Logger.I.info(`Thread ${this.ctx.index} has finished putting chunks.`)
    }
}
