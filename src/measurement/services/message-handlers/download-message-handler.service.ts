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
    private _downloadStartTime = Time.nowNs()
    private _downloadEndTime = Time.nowNs()
    private _downloadBytesRead = 0
    private _activityInterval?: NodeJS.Timer
    private _inactivityTimeout = 1000
    private _result = new MeasurementThreadResultList(0)
    private _nsec = Infinity
    private _isFinishRequested = false
    private _interimHandlerInterval?: NodeJS.Timer
    private _interimHandlerTimeout = 200

    get downloadStartTime() {
        return this._downloadStartTime
    }

    get downloadEndTime() {
        return this._downloadEndTime
    }

    get result() {
        return this._result
    }

    get activityInterval() {
        return this._activityInterval
    }

    get interimHandlerInterval() {
        return this._interimHandlerInterval
    }

    get isFinishRequested() {
        return this._isFinishRequested
    }

    get downloadBytesRead() {
        return this._downloadBytesRead
    }

    get nsec() {
        return this._nsec
    }

    constructor(
        private ctx: IMessageHandlerContext,
        public onFinish: (result: IMeasurementThreadResult) => void
    ) {
        const maxStoredResults =
            (Number(this.ctx.params.test_duration) * 1e9) /
            DownloadMessageHandler.minDiffTime
        this._result = new MeasurementThreadResultList(Number(maxStoredResults))
    }

    stopMessaging() {
        Logger.I.info(
            ELoggerMessage.T_PHASE_FINISHED,
            this.ctx.phase,
            this.ctx.index
        )
        clearInterval(this._interimHandlerInterval)
        clearInterval(this._activityInterval)
        this.ctx.threadResult!.down = this.result
        this.onFinish?.(this.ctx.threadResult!)
    }

    writeData(): void {
        this._downloadStartTime = Time.nowNs()
        this._downloadEndTime =
            this.downloadStartTime + Number(this.ctx.params.test_duration) * 1e9
        this._activityInterval = setInterval(() => {
            this.checkActivity()
        }, this._inactivityTimeout)
        const msg = `${ESocketMessage.GETTIME} ${
            this.ctx.params.test_duration
        }${
            this.ctx.chunkSize === this.ctx.defaultChunkSize
                ? "\n"
                : ` ${this.ctx.chunkSize}\n`
        }`
        Logger.I.info(ELoggerMessage.T_SENDING_MESSAGE, this.ctx.index, msg)
        this.ctx.client.write(msg)
        this._interimHandlerInterval = setInterval(
            () => this.submitResults(),
            this._interimHandlerTimeout
        )
    }

    checkActivity = () => {
        Logger.I.info(ELoggerMessage.T_CHECKING_ACTIVITY, this.ctx.index)
        if (Time.nowNs() >= this.downloadEndTime) {
            Logger.I.info(ELoggerMessage.T_TIMEOUT, this.ctx.index)
            this.requestFinish()
        }
    }

    submitResults = () => {
        if (this.ctx.threadResult) {
            const lastIndex = this.result.nsec.length - 1
            this.ctx.threadResult!.down = this.result
            this.ctx.threadResult!.currentTime.down =
                this.result.nsec[lastIndex]
            this.ctx.threadResult!.currentTransfer.down =
                this.result.bytes[lastIndex]
            this.ctx.interimHandler?.(this.ctx.threadResult!)
        }
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
            this._downloadBytesRead = this.downloadBytesRead + data.byteLength
            const newNsec = Time.nowNs() - this.downloadStartTime
            this._nsec =
                this.nsec === Infinity
                    ? newNsec
                    : Math.floor((this.nsec + newNsec) / 2)
            lastByte = data[data.length - 1]
            isFullChunk = this.downloadBytesRead % this.ctx.chunkSize === 0
        }
        if (isFullChunk && (lastByte === 0x00 || lastByte === 0xff)) {
            this.result.addResult(this.downloadBytesRead, this.nsec)
            this._nsec = Infinity
        }
        if (isFullChunk && lastByte === 0xff) {
            this.requestFinish()
        }
    }

    private requestFinish() {
        clearInterval(this._activityInterval)
        this._activityInterval = setInterval(
            this.stopMessaging.bind(this),
            this._inactivityTimeout
        )
        this._isFinishRequested = true
        this.ctx.client.write(ESocketMessage.OK)
    }
}
