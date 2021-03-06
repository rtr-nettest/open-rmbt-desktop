import { SingleThreadResult } from "../../dto/single-thread-result.dto"
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
    static statsIntervalTime = 1001001
    static waitForAllChunksTime = 3000
    static clientTimeOffset = 1e9
    private uploadEndTime = 0
    private result = new SingleThreadResult(0)
    private activityInterval?: NodeJS.Timer
    private inactivityTimeout = 0
    private finalTimeout?: NodeJS.Timeout
    private rngDelay = 0

    constructor(
        private ctx: IMessageHandlerContext,
        public onFinish: (result: IMeasurementThreadResult) => void
    ) {
        const maxStoredResults =
            (Number(this.ctx.params.test_duration) * 1e9) /
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
        this.setActivityInterval()
        const msg = `${ESocketMessage.PUT}${
            this.ctx.chunkSize === this.ctx.defaultChunkSize
                ? "\n"
                : ` ${this.ctx.chunkSize}\n`
        }`
        Logger.I.info(`Thread ${this.ctx.index} is sending "${msg}"`)
        this.ctx.client.write(msg)
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
                const nanos = Number(dataArr[1]) - this.rngDelay
                const bytes = Number(dataArr[3])
                if (
                    bytes > 0 &&
                    nanos > 0 &&
                    Time.nowNs() < this.uploadEndTime
                ) {
                    this.result.addResult(bytes, nanos)
                    this.ctx.currentTime = nanos
                    this.ctx.currentTransfer = bytes
                }
                if (
                    nanos >=
                    this.uploadEndTime - UploadMessageHandler.clientTimeOffset
                ) {
                    this.stopMessaging()
                } else {
                    this.putChunks()
                }
            }
            return
        }
        if (data.includes(ESocketMessage.ACCEPT_GETCHUNKS)) {
            this.stopMessaging()
            return
        }
    }

    private putChunks() {
        const statsTime = Time.nowNs() + UploadMessageHandler.statsIntervalTime
        while (true) {
            let bufferGenStartTime = Time.nowNs()
            let buffer = randomBytes(this.ctx.chunkSize)
            this.rngDelay = this.rngDelay + (Time.nowNs() - bufferGenStartTime)
            if (Time.nowNs() >= this.uploadEndTime) {
                buffer[buffer.length - 1] = 0xff
                this.ctx.client.write(buffer)
                if (!this.finalTimeout) {
                    this.finalTimeout = setTimeout(
                        () => this.stopMessaging.bind(this),
                        UploadMessageHandler.waitForAllChunksTime
                    )
                }
                break
            } else {
                buffer[buffer.length - 1] = 0x00
                this.ctx.client.write(buffer)
                if (Time.nowNs() >= statsTime) {
                    break
                }
            }
        }
    }

    private setActivityInterval() {
        clearInterval(this.activityInterval)
        const uploadDuration = Number(this.ctx.params.test_duration) * 1e9
        this.uploadEndTime = Time.nowNs() + uploadDuration
        this.activityInterval = setInterval(() => {
            Logger.I.info(`Checking activity on thread ${this.ctx.index}...`)
            if (Time.nowNs() > this.uploadEndTime) {
                Logger.I.info(`Thread ${this.ctx.index} timed out.`)
                this.stopMessaging()
            }
        }, this.inactivityTimeout)
    }
}
