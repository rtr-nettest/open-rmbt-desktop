import { ESocketMessage } from "../../enums/socket-message.enum"
import {
    IMessageHandler,
    IMessageHandlerContext,
} from "../../interfaces/message-handler.interface"
import { Logger } from "../logger.service"
import { Time } from "../time.service"

export class PreDownloadMessageHandler implements IMessageHandler {
    private preDownloadChunks = 1
    private preDownloadEndTime = Time.nowNs()
    private preDownloadDuration = 2000000000
    private preDownloadBytesRead = Buffer.alloc(0)
    private activityInterval?: NodeJS.Timer

    constructor(
        private ctx: IMessageHandlerContext,
        public onFinish: (result: {
            chunks: number
            totalDownload: number
        }) => void
    ) {}

    stopMessaging(): void {
        Logger.I.info(`Predownload is finished for thread ${this.ctx.index}`)
        clearInterval(this.activityInterval)
        this.onFinish?.({
            chunks: this.preDownloadChunks,
            totalDownload: this.preDownloadBytesRead.byteLength,
        })
    }

    writeData(): void {
        this.preDownloadBytesRead = Buffer.alloc(0)
        this.preDownloadChunks = 1
        this.preDownloadEndTime = Time.nowNs() + this.preDownloadDuration
        this.getChunks()
    }

    readData(data: Buffer): void {
        if (data.includes(ESocketMessage.ACCEPT_GETCHUNKS)) {
            if (Time.nowNs() < this.preDownloadEndTime) {
                this.preDownloadChunks *= 2
                this.getChunks()
            } else {
                this.stopMessaging()
            }
            return
        }
        if (data.includes(ESocketMessage.TIME)) {
            return
        }
        let lastByte = 0
        let isFullChunk = false
        if (data.length > 0) {
            this.preDownloadBytesRead = Buffer.alloc(
                this.preDownloadBytesRead.byteLength + data.byteLength
            )
            isFullChunk =
                this.preDownloadBytesRead.byteLength % this.ctx.chunksize === 0
            lastByte = data[data.length - 1]
        }
        if (isFullChunk && lastByte === 0xff) {
            this.finishChunkPortion()
        }
    }

    private getChunks() {
        clearInterval(this.activityInterval)
        this.activityInterval = setInterval(() => {
            Logger.I.info(`Checking activity on thread ${this.ctx.index}...`)
            if (Time.nowNs() > this.preDownloadEndTime) {
                Logger.I.info(`Thread ${this.ctx.index} timed out.`)
                this.finishChunkPortion()
            }
        }, 1000)
        Logger.I.info(
            `Thread ${this.ctx.index} getting ${this.preDownloadChunks} chunks.`
        )
        this.ctx.client.write(
            `${ESocketMessage.GETCHUNKS} ${this.preDownloadChunks}\n`,
            "ascii"
        )
    }

    private finishChunkPortion() {
        clearInterval(this.activityInterval)
        Logger.I.info(
            `Thread ${this.ctx.index} is ${ESocketMessage.OK}Continuing.`
        )
        this.ctx.client.write(ESocketMessage.OK)
    }
}
