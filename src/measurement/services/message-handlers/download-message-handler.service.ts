import { hrtime } from "process"
import { MeasurementThreadResultList } from "../../dto/measurement-thread-result-list.dto"
import { ESocketMessage } from "../../enums/socket-message.enum"
import { IMeasurementThreadResult } from "../../interfaces/measurement-result.interface"
import {
    IMessageHandler,
    IMessageHandlerContext,
} from "../../interfaces/message-handler.interface"
import { Logger } from "../logger.service"
import { Time } from "../time.service"

export class DownloadMessageHandler implements IMessageHandler {
    static minDiffTime = 100000000
    private downloadStartTime = hrtime.bigint()
    private downloadEndTime = hrtime.bigint()
    private downloadBytesRead = 0
    private activityInterval?: NodeJS.Timer
    private inactivityTimeout = 1000
    private result = new MeasurementThreadResultList(0)
    private nsec = 0
    private isFinishRequested = false

    constructor(
        private ctx: IMessageHandlerContext,
        public onFinish: (result: IMeasurementThreadResult) => void
    ) {
        const maxStoredResults =
            (Number(this.ctx.params.test_duration) * 1e9) /
            DownloadMessageHandler.minDiffTime
        this.result = new MeasurementThreadResultList(Number(maxStoredResults))
    }

    stopMessaging() {
        clearInterval(this.activityInterval)
        Logger.I.info(`Download is stopped for thread ${this.ctx.index}`)
        this.ctx.threadResult.down = this.result
        this.ctx.threadResult.speedItems = this.result.getSpeedItems(
            "download",
            this.ctx.index
        )
        this.onFinish?.(this.ctx.threadResult)
    }

    writeData(): void {
        this.downloadStartTime = hrtime.bigint()
        this.downloadEndTime =
            this.downloadStartTime +
            BigInt(+this.ctx.params.test_duration * 1e9)
        this.activityInterval = setInterval(() => {
            Logger.I.info(`Checking activity on thread ${this.ctx.index}...`)
            if (hrtime.bigint() >= this.downloadEndTime) {
                Logger.I.info(`Thread ${this.ctx.index} download timed out.`)
                this.requestFinish()
            }
        }, this.inactivityTimeout)
        const msg = `${ESocketMessage.GETTIME} ${
            this.ctx.params.test_duration
        }${
            this.ctx.chunkSize === this.ctx.defaultChunkSize
                ? "\n"
                : ` ${this.ctx.chunkSize}\n`
        }`
        Logger.I.info(`Thread ${this.ctx.index} is sending "${msg}"`)
        this.ctx.client.write(msg)
    }

    readData(data: Buffer): void {
        if (
            data.includes(ESocketMessage.ACCEPT_GETCHUNKS) &&
            this.isFinishRequested
        ) {
            this.stopMessaging()
            return
        }
        if (data.includes(ESocketMessage.TIME)) {
            return
        }
        let lastByte = 0
        let isFullChunk = false
        if (data.length > 0) {
            this.downloadBytesRead = this.downloadBytesRead + data.byteLength

            this.nsec = Number(hrtime.bigint() - this.downloadStartTime)
            this.result.addResult(this.downloadBytesRead, this.nsec)

            isFullChunk = this.downloadBytesRead % this.ctx.chunkSize === 0

            lastByte = data[data.length - 1]

            this.ctx.currentTime = this.nsec
            this.ctx.currentTransfer = this.downloadBytesRead
            this.ctx.threadResult.down = this.result
            this.ctx.interimHandler?.({
                ...this.ctx.threadResult,
                currentTime: this.ctx.currentTime,
                currentTransfer: this.ctx.currentTransfer,
            })
        }
        if (isFullChunk && lastByte === 0xff) {
            this.requestFinish()
        }
    }

    private requestFinish() {
        clearInterval(this.activityInterval)
        this.activityInterval = setInterval(
            this.stopMessaging.bind(this),
            this.inactivityTimeout
        )
        this.isFinishRequested = true
        this.ctx.client.write(ESocketMessage.OK)
    }
}
