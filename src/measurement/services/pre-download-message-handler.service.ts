import { Socket } from "net"
import { hrtime } from "process"
import { ESocketMessage } from "../enums/socket-message.enum"
import { IMessageHandler } from "../interfaces/message-handler.interface"
import { Logger } from "./logger.service"

export class PreDownloadMessageHandler implements IMessageHandler {
    private preDownloadChunks = 1
    private preDownloadEndTime = hrtime.bigint()
    private preDownloadDuration = 2000000000n
    private preDownloadBytesRead = Buffer.alloc(0)
    private activityInterval?: NodeJS.Timer

    constructor(
        public onFinish: (chunks: number) => void,
        private client: Socket,
        private index: number,
        private chunksize: number,
        private setInput: (input: number) => void
    ) {}

    writeData(): void {
        this.preDownloadBytesRead = Buffer.alloc(0)
        this.preDownloadChunks = 1
        this.preDownloadEndTime = hrtime.bigint() + this.preDownloadDuration
        this.getChunks()
    }

    readData(data: Buffer): void {
        if (data.includes(ESocketMessage.ACCEPT_GETCHUNKS)) {
            if (hrtime.bigint() < this.preDownloadEndTime) {
                this.preDownloadChunks *= 2
                this.getChunks()
            } else {
                Logger.I.info(
                    `Predownload is finished for thread ${this.index}`
                )
                clearInterval(this.activityInterval)
                this.onFinish?.(this.preDownloadChunks)
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
                this.preDownloadBytesRead.byteLength % this.chunksize === 0
            lastByte = data[data.length - 1]
            this.setInput?.(this.preDownloadBytesRead.byteLength)
        }
        if (isFullChunk && lastByte === 0xff) {
            this.finishChunkPortion()
        }
    }

    private getChunks() {
        clearInterval(this.activityInterval)
        this.activityInterval = setInterval(() => {
            Logger.I.info(`Checking activity on thread ${this.index}...`)
            if (hrtime.bigint() > this.preDownloadEndTime) {
                Logger.I.info(`Thread ${this.index} timed out.`)
                this.finishChunkPortion()
            }
        }, 1000)
        Logger.I.info(
            `Thread ${this.index} getting ${this.preDownloadChunks} chunks.`
        )
        this.client.write(
            `${ESocketMessage.GETCHUNKS} ${this.preDownloadChunks}\n`,
            "ascii"
        )
    }

    private finishChunkPortion() {
        clearInterval(this.activityInterval)
        Logger.I.info(`Thread ${this.index} is ${ESocketMessage.OK}Continuing.`)
        this.client.write(ESocketMessage.OK)
    }
}
