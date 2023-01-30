import { randomBytes } from "crypto"
import { ESocketMessage } from "../../enums/socket-message.enum"
import {
    IMessageHandler,
    IMessageHandlerContext,
} from "../../interfaces/message-handler.interface"
import { Logger } from "../logger.service"
import { Time } from "../time.service"

export class PreUploadMessageHandler implements IMessageHandler {
    private preUploadEndTime = Time.nowNs()
    private preUploadDuration = 2000000000

    constructor(
        private ctx: IMessageHandlerContext,
        public onFinish: () => void
    ) {}

    stopMessaging(): void {
        this.onFinish?.()
    }

    writeData(): void {
        this.preUploadEndTime = Time.nowNs() + this.preUploadDuration
        Logger.I.info(`Thread ${this.ctx.index} starts sending chunks.`)
        this.putNoResult()
    }

    readData(data: Buffer): void {
        if (data.includes(ESocketMessage.OK)) {
            this.putChunks()
            return
        }
        if (data.includes(ESocketMessage.ACCEPT_GETCHUNKS)) {
            if (Time.nowNs() < this.preUploadEndTime) {
                this.putNoResult()
            } else {
                this.stopMessaging()
            }
            return
        }
    }

    private putNoResult() {
        Logger.I.info(`Thread ${this.ctx.index} sending PUTNORESULT.`)
        this.ctx.client.write(`${ESocketMessage.PUTNORESULT}\n`)
    }

    private putChunks() {
        this.ctx.preUploadChunks = !this.ctx.preUploadChunks
            ? 1
            : this.ctx.preUploadChunks * 2
        for (let i = 0; i < this.ctx.preUploadChunks; i++) {
            const buffer = randomBytes(this.ctx.chunkSize)
            if (i == this.ctx.preUploadChunks - 1) {
                buffer[buffer.length - 1] = 0xff
            }
            this.ctx.client.write(buffer)
        }
    }
}
