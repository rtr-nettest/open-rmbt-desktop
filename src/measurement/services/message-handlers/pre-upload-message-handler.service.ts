import { randomBytes } from "crypto"
import { ESocketMessage } from "../../enums/socket-message.enum"
import {
    IMessageHandler,
    IMessageHandlerContext,
} from "../../interfaces/message-handler.interface"
import { Logger } from "../logger.service"

export class PreUploadMessageHandler implements IMessageHandler {
    private preUploadDuration = 8 * 1e8
    private buffers: Buffer[] = []
    private deliveryTimes: number[] = []
    private totalDeliveryTime = 0

    constructor(
        private ctx: IMessageHandlerContext,
        public onFinish: () => void
    ) {
        let maxStoredResults = 3
        while (maxStoredResults > 0) {
            this.buffers.push(randomBytes(this.ctx.chunkSize))
            maxStoredResults--
        }
    }

    stopMessaging(): void {
        this.onFinish?.()
    }

    writeData(): void {
        Logger.I.info(`Thread ${this.ctx.index} starts sending chunks.`)
        this.ctx.preUploadChunks = 0
        this.putNoResult()
    }

    readData(data: Buffer): void {
        if (data.indexOf(ESocketMessage.OK) === 0) {
            this.putChunks()
            return
        }
        if (data.indexOf(ESocketMessage.TIME) === 0) {
            let timestamp = Number(data.toString().split(" ")[1])
            timestamp = isNaN(timestamp) ? 0 : timestamp
            this.deliveryTimes.push(timestamp)
            this.totalDeliveryTime += timestamp
            const averageDeliveryTime =
                this.totalDeliveryTime / this.deliveryTimes.length
            if (
                this.totalDeliveryTime + averageDeliveryTime * 2 <
                this.preUploadDuration
            ) {
                this.putNoResult()
            } else {
                this.stopMessaging()
            }
            return
        }
    }

    private putNoResult() {
        this.ctx.preUploadChunks =
            !this.ctx.preUploadChunks || this.ctx.preUploadChunks <= 0
                ? 1
                : this.ctx.preUploadChunks * 2
        Logger.I.info(
            `Thread ${this.ctx.index} is writing ${ESocketMessage.PUTNORESULT}.`
        )
        this.ctx.client.write(`${ESocketMessage.PUTNORESULT}\n`)
    }

    private putChunks() {
        Logger.I.info(`Thread ${this.ctx.index} is putting chunks.`)
        let bufferIndex = 0
        for (let i = 0; i < this.ctx.preUploadChunks; i++) {
            let buffer = this.buffers[bufferIndex]!
            if (bufferIndex >= this.buffers.length - 1) {
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
