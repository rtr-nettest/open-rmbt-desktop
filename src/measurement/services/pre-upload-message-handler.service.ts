import { Socket } from "net"
import { hrtime } from "process"
import { randomBytes } from "crypto"
import { ESocketMessage } from "../enums/socket-message.enum"
import { IMessageHandler } from "../interfaces/message-handler.interface"
import { Logger } from "./logger.service"

export class PreUploadMessageHandler implements IMessageHandler {
    public totalUpload = 0
    public preUploadChunks = 0
    private preUploadEndTime = hrtime.bigint()
    private preUploadDuration = 2000000000n

    constructor(
        private client: Socket,
        private index: number,
        private chunksize: number,
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
        this.preUploadEndTime = hrtime.bigint() + this.preUploadDuration
        Logger.I.info(`Thread ${this.index} starts sending chunks.`)
        this.putNoResult()
    }

    readData(data: Buffer): void {
        if (data.includes(ESocketMessage.OK)) {
            this.putChunks()
            return
        }
        if (data.includes(ESocketMessage.ACCEPT_GETCHUNKS)) {
            if (hrtime.bigint() < this.preUploadEndTime) {
                this.putNoResult()
            } else {
                this.stopMessaging()
            }
            return
        }
    }

    private putNoResult() {
        Logger.I.info(`Thread ${this.index} sending PUTNORESULT.`)
        this.client.write(ESocketMessage.PUTNORESULT)
    }

    private putChunks() {
        this.preUploadChunks = !this.preUploadChunks
            ? 1
            : this.preUploadChunks * 2
        Logger.I.info(
            `Thread ${this.index} sending ${this.preUploadChunks} chunks.`
        )
        for (let i = 0; i < this.preUploadChunks; i++) {
            const buffer = randomBytes(this.chunksize)
            if (i == this.preUploadChunks - 1) {
                buffer[buffer.length - 1] = 0xff
            }
            this.client.write(buffer)
            this.totalUpload += buffer.byteLength
            Logger.I.info(
                `Thread ${this.index} has sent ${this.totalUpload} bytes.`
            )
        }
    }
}
