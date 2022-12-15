import { MeasurementThreadResultList } from "../../dto/measurement-thread-result-list.dto"
import { ESocketMessage } from "../../enums/socket-message.enum"
import { IMeasurementThreadResult } from "../../interfaces/measurement-result.interface"
import {
    IMessageHandler,
    IMessageHandlerContext,
} from "../../interfaces/message-handler.interface"
import { DownloadMessageHandler } from "./download-message-handler.service"
import { Logger } from "../logger.service"
import { Time } from "../time.service"
import { randomBytes } from "crypto"

export class UploadMessageHandler implements IMessageHandler {
    static waitForAllChunksTimeMs = 3000
    static clientTimeOffsetNs = 1e9
    private uploadEndTimeNs = 0
    private result = new MeasurementThreadResultList(0)
    private activityInterval?: NodeJS.Timer
    private inactivityTimeoutMs = 1000
    private finalTimeout?: NodeJS.Timeout
    private buffers: Buffer[] = []
    private bytesWritten = 0

    constructor(
        private ctx: IMessageHandlerContext,
        public onFinish: (result: IMeasurementThreadResult) => void
    ) {
        let maxStoredResults =
            (Number(this.ctx.params.test_duration) * 1e9) /
            DownloadMessageHandler.minDiffTime
        this.result = new MeasurementThreadResultList(Number(maxStoredResults))
        maxStoredResults = 3
        while (maxStoredResults > 0) {
            this.buffers.push(randomBytes(this.ctx.chunkSize))
            maxStoredResults--
        }
    }

    stopMessaging(): void {
        clearInterval(this.activityInterval)
        Logger.I.info(`Upload is finished for thread ${this.ctx.index}`)
        this.ctx.threadResult.up = this.result
        this.ctx.threadResult.speedItems = this.result.getSpeedItems(
            "upload",
            this.ctx.index
        )
        this.onFinish?.(this.ctx.threadResult)
    }

    writeData(): void {
        this.setActivityInterval()
        const msg = `${ESocketMessage.PUT}${
            this.ctx.chunkSize === this.ctx.defaultChunkSize
                ? "\n"
                : ` ${this.ctx.chunkSize}\n`
        }`
        Logger.I.info(`Thread ${this.ctx.index} is sending "${msg}"`)
        this.ctx.client.write(msg)
        this.ctx.client.on("drain", this.putChunks.bind(this))
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
                const nanos = +dataArr[1]
                const bytes = +dataArr[3]
                const nowNs = Time.nowNs()
                if (bytes > 0 && nanos > 0 && nowNs < this.uploadEndTimeNs) {
                    this.result.addResult(bytes, nanos)
                    this.ctx.currentTime = nanos
                    this.ctx.currentTransfer = bytes
                    this.ctx.interimHandler?.({
                        ...this.ctx.threadResult,
                        currentTime: this.ctx.currentTime,
                        currentTransfer: this.ctx.currentTransfer,
                    })
                }
                if (
                    nanos >=
                    this.uploadEndTimeNs -
                        UploadMessageHandler.clientTimeOffsetNs
                ) {
                    this.stopMessaging()
                }
            }
            return
        }
        if (data.includes(ESocketMessage.ACCEPT_GETCHUNKS)) {
            this.stopMessaging()
            return
        }
    }

    private writeToSocketNextTick(buffer: Buffer) {
        process.nextTick(() => {
            this.ctx.client.write(buffer)
        })
    }

    private putChunks() {
        let bufferIndex = 0
        while (true) {
            let buffer = this.buffers[bufferIndex]!
            if (bufferIndex >= this.buffers.length - 1) {
                bufferIndex = 0
            } else {
                bufferIndex++
            }
            const nowNs = Time.nowNs()
            if (nowNs >= this.uploadEndTimeNs) {
                buffer[buffer.length - 1] = 0xff
                this.writeToSocketNextTick(buffer)
                if (!this.finalTimeout) {
                    this.finalTimeout = setTimeout(
                        () => this.stopMessaging.bind(this),
                        UploadMessageHandler.waitForAllChunksTimeMs
                    )
                }
                break
            } else {
                buffer[buffer.length - 1] = 0x00
                this.writeToSocketNextTick(buffer)
                this.bytesWritten += buffer.length
                if (
                    this.bytesWritten >= this.ctx.client.writableHighWaterMark
                ) {
                    this.bytesWritten = 0
                    break
                }
            }
        }
    }

    private setActivityInterval() {
        clearInterval(this.activityInterval)
        const uploadDuration = Number(this.ctx.params.test_duration) * 1e9
        this.uploadEndTimeNs = Time.nowNs() + uploadDuration
        this.activityInterval = setInterval(() => {
            Logger.I.info(`Checking activity on thread ${this.ctx.index}...`)
            if (Time.nowNs() > this.uploadEndTimeNs) {
                Logger.I.info(`Thread ${this.ctx.index} upload timed out.`)
                this.stopMessaging()
            }
        }, this.inactivityTimeoutMs)
    }
}
