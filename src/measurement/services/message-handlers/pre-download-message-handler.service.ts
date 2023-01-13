import { ESocketMessage } from "../../enums/socket-message.enum"
import {
    IMessageHandler,
    IMessageHandlerContext,
} from "../../interfaces/message-handler.interface"
import { Logger } from "../logger.service"
import { Time } from "../time.service"

export class PreDownloadMessageHandler implements IMessageHandler {
    private preDownloadEndTime = Time.nowNs()
    private preDownloadDuration = 2000000000
    private preDownloadBytesRead = -1
    private activityInterval?: NodeJS.Timer
    private inactivityTimeout = 1000

    constructor(
        private ctx: IMessageHandlerContext,
        public onFinish: () => void
    ) {}

    stopMessaging(): void {
        Logger.I.info(`Predownload is finished for thread ${this.ctx.index}`)
        clearInterval(this.activityInterval)
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
        if (data.includes(ESocketMessage.TIME)) {
            const timeNs = Number(data.toString().split(" ")[1])
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
        clearInterval(this.activityInterval)
        this.activityInterval = setInterval(() => {
            Logger.I.info(`Checking activity on thread ${this.ctx.index}...`)
            if (Time.nowNs() >= this.preDownloadEndTime) {
                Logger.I.info(
                    `Thread ${this.ctx.index} pre-download timed out.`
                )
                this.finishChunkPortion()
                this.activityInterval = setInterval(
                    this.stopMessaging.bind(this),
                    this.inactivityTimeout
                )
            }
        }, this.inactivityTimeout)
        this.ctx.client.write(
            `${ESocketMessage.GETCHUNKS} ${this.ctx.preDownloadChunks}\n`
        )
    }

    private finishChunkPortion() {
        clearInterval(this.activityInterval)
        this.ctx.client.write(ESocketMessage.OK)
    }
}
