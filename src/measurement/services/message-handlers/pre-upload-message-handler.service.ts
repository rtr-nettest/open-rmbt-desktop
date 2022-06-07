import { randomBytes } from "crypto"
import { ESocketMessage } from "../../enums/socket-message.enum"
import {
    IMessageHandler,
    IMessageHandlerContext,
} from "../../interfaces/message-handler.interface"
import { Logger } from "../logger.service"
import { Time } from "../time.service"

export class PreUploadMessageHandler implements IMessageHandler {
    public totalUpload = 0
    public preUploadChunks = 0
    private preUploadEndTime = Time.nowNs()
    private preUploadDuration = 2000000000n

    constructor(
        private ctx: IMessageHandlerContext,
        public onFinish: (result: {
            chunks: number
            totalUpload: number
        }) => void
    ) {}

    stopMessaging(): void {
        this.onFinish?.({
            chunks: this.preUploadChunks,
            totalUpload: this.totalUpload,
        })
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
        this.ctx.client.write(ESocketMessage.PUTNORESULT)
    }

    private putChunks() {
        this.preUploadChunks = !this.preUploadChunks
            ? 1
            : this.preUploadChunks * 2
        Logger.I.info(
            `Thread ${this.ctx.index} sending ${this.preUploadChunks} chunks.`
        )
        for (let i = 0; i < this.preUploadChunks; i++) {
            const buffer = randomBytes(this.ctx.chunksize)
            if (i == this.preUploadChunks - 1) {
                buffer[buffer.length - 1] = 0xff
            }
            this.ctx.client.write(buffer)
            this.totalUpload += buffer.byteLength
            Logger.I.info(
                `Thread ${this.ctx.index} has sent ${this.totalUpload} bytes.`
            )
        }
    }
}
