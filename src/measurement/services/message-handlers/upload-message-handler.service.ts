import { randomBytes } from "crypto"
import { hrtime } from "process"
import { SingleThreadResult } from "../../dto/single-thread-result.dto"
import { ESocketMessage } from "../../enums/socket-message.enum"
import { IMeasurementThreadResult } from "../../interfaces/measurement-result.interface"
import {
    IMessageHandler,
    IMessageHandlerContext,
} from "../../interfaces/message-handler.interface"
import { DownloadMessageHandler } from "./download-message-handler.service"
import { Logger } from "../logger.service"

export class UploadMessageHandler implements IMessageHandler {
    private uploadEndTime = 0n
    private result = new SingleThreadResult(0)
    private activityInterval?: NodeJS.Timer
    private inactivityTimeout = 0

    constructor(
        private ctx: IMessageHandlerContext,
        private setIntermidiateResults: (
            currentTransfer: number,
            currentTime: bigint
        ) => void,
        public onFinish: (result: IMeasurementThreadResult) => void
    ) {
        const maxStoredResults =
            (BigInt(this.ctx.params.test_duration) * BigInt(1e9)) /
            DownloadMessageHandler.minDiffTime
        this.result = new SingleThreadResult(Number(maxStoredResults))
        this.inactivityTimeout = Number(this.ctx.params.test_duration) * 1000
    }

    stopMessaging(): void {
        clearInterval(this.activityInterval)
        Logger.I.info(`Upload is finished for thread ${this.ctx.index}`)
        this.ctx.threadResult.up = this.result.getAllResults()
        this.ctx.threadResult.speedItems = this.result.addSpeedItems(
            this.ctx.threadResult.speedItems,
            true,
            this.ctx.index
        )
        this.onFinish?.(this.ctx.threadResult)
    }

    writeData(): void {
        Logger.I.info(`Thread ${this.ctx.index} sending PUT.`)
        this.setActivityInterval()
        this.ctx.client.write(ESocketMessage.PUT)
    }

    readData(data: Buffer): void {
        if (data.includes(ESocketMessage.OK)) {
            this.setActivityInterval()
            this.putChunks()
            return
        }
        if (data.includes(ESocketMessage.TIME)) {
            const dataArr = data.toString().trim().split(" ")
            if (dataArr.length === 4) {
                const nanos = BigInt(Number(dataArr[1]))
                const bytes = Number(dataArr[3])
                if (bytes > 0 && nanos > 0n) {
                    this.result.addResult(bytes, nanos)
                    this.setIntermidiateResults(bytes, nanos)
                }
                this.putChunks()
            }
            return
        }
        if (data.includes(ESocketMessage.ACCEPT_GETCHUNKS)) {
            this.stopMessaging()
            return
        }
    }

    private putChunks() {
        let chunkCounter = Math.max(
            this.ctx.preUploadChunks || 1,
            this.ctx.preDownloadChunks || 1
        )
        while (chunkCounter > 0) {
            const buffer = randomBytes(this.ctx.chunksize)
            if (chunkCounter === 1 || hrtime.bigint() >= this.uploadEndTime) {
                buffer[buffer.length - 1] = 0xff
                chunkCounter = 0
                Logger.I.info(
                    `Thread ${this.ctx.index} sending the last chunk.`
                )
            } else {
                buffer[buffer.length - 1] = 0x00
                chunkCounter -= 1
                Logger.I.info(`Thread ${this.ctx.index} sending a chunk.`)
            }
            this.ctx.client.write(buffer)
        }
    }

    private setActivityInterval() {
        clearInterval(this.activityInterval)
        const uploadDuration =
            BigInt(this.ctx.params.test_duration) * BigInt(1e9)
        this.uploadEndTime = hrtime.bigint() + uploadDuration
        this.activityInterval = setInterval(() => {
            Logger.I.info(`Checking activity on thread ${this.ctx.index}...`)
            if (hrtime.bigint() > this.uploadEndTime) {
                Logger.I.info(`Thread ${this.ctx.index} timed out.`)
                this.stopMessaging()
            }
        }, this.inactivityTimeout)
    }
}
