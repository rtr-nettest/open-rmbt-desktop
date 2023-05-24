import { hrtime } from "process"
import { MeasurementThreadResultList } from "../../dto/measurement-thread-result-list.dto"
import { ESocketMessage } from "../../enums/socket-message.enum"
import { IMeasurementThreadResult } from "../../interfaces/measurement-result.interface"
import {
    IMessageHandler,
    IMessageHandlerContext,
} from "../../interfaces/message-handler.interface"
import { Logger } from "../logger.service"
import { ELoggerMessage } from "../../enums/logger-message.enum"
import { Time } from "../time.service"

export class DownloadMessageHandler implements IMessageHandler {
    static minDiffTime = 20000000
    private downloadStartTime = Time.nowNs()
    private downloadEndTime = Time.nowNs()
    private downloadBytesRead = 0
    private activityInterval?: NodeJS.Timer
    private inactivityTimeout = 1000
    private result = new MeasurementThreadResultList(0)
    private nsec = 0
    private nsecStart = Infinity
    private isFinishRequested = false
    private interimHandlerInterval?: NodeJS.Timer
    private interimHandlerTimeout = 200

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
        Logger.I.info(
            ELoggerMessage.T_PHASE_FINISHED,
            this.ctx.phase,
            this.ctx.index
        )
        clearInterval(this.interimHandlerInterval)
        clearInterval(this.activityInterval)
        this.ctx.threadResult!.down = this.result
        this.onFinish?.(this.ctx.threadResult!)
    }

    writeData(): void {
        this.downloadStartTime = Time.nowNs()
        this.downloadEndTime =
            this.downloadStartTime + Number(this.ctx.params.test_duration) * 1e9
        this.activityInterval = setInterval(() => {
            Logger.I.info(ELoggerMessage.T_CHECKING_ACTIVITY, this.ctx.index)
            if (hrtime.bigint() >= this.downloadEndTime) {
                Logger.I.info(ELoggerMessage.T_TIMEOUT, this.ctx.index)
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
        Logger.I.info(ELoggerMessage.T_SENDING_MESSAGE, this.ctx.index, msg)
        this.ctx.client.write(msg)
        this.interimHandlerInterval = setInterval(() => {
            if (this.ctx.threadResult) {
                this.ctx.threadResult!.down = this.result
                this.ctx.threadResult!.currentTime.down = this.nsec
                this.ctx.threadResult!.currentTransfer.down =
                    this.downloadBytesRead
                this.ctx.interimHandler?.(this.ctx.threadResult!)
            }
        }, this.interimHandlerTimeout)
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
            this.nsecStart = Math.min(this.nsecStart, Time.nowNs())
            lastByte = data[data.length - 1]
            isFullChunk = this.downloadBytesRead % this.ctx.chunkSize === 0
        }
        if (isFullChunk && (lastByte === 0x00 || lastByte === 0xff)) {
            this.nsec = this.nsecStart - this.downloadStartTime
            this.nsecStart = Infinity
            this.result.addResult(this.downloadBytesRead, this.nsec)
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
