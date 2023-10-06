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
import { ELoggerMessage } from "../../enums/logger-message.enum"

export class UploadMessageHandler implements IMessageHandler {
    static waitForAllChunksTimeMs = 1000
    static clientTimeOffsetNs = 1e9
    private _uploadEndTimeNs = 0
    private _result = new MeasurementThreadResultList(0)
    private _finalTimeout?: NodeJS.Timeout
    private _buffers: Buffer[] = []
    private _bytesWritten = 0
    private _interimHandlerInterval?: NodeJS.Timeout
    private _isRunning = true

    get waterMark() {
        return this.ctx.client.writableHighWaterMark
    }

    get uploadEndTimeNs() {
        return this._uploadEndTimeNs
    }

    get result() {
        return this._result
    }

    get buffers() {
        return this._buffers
    }

    get bytesWritten() {
        return this._bytesWritten
    }

    constructor(
        private ctx: IMessageHandlerContext,
        public onFinish: (_result: IMeasurementThreadResult) => void
    ) {
        let maxStoredResults =
            (Number(this.ctx.params.test_duration) * 1e9) /
            DownloadMessageHandler.minDiffTime
        this._result = new MeasurementThreadResultList(Number(maxStoredResults))
        maxStoredResults = 3
        while (maxStoredResults > 0) {
            this._buffers.push(randomBytes(this.ctx.chunkSize))
            maxStoredResults--
        }
    }

    stopMessaging(): void {
        Logger.I.info(
            ELoggerMessage.T_PHASE_FINISHED,
            this.ctx.phase,
            this.ctx.index
        )
        this._isRunning = false
        this.ctx.client.off("drain", this.putChunks)
        clearInterval(this._interimHandlerInterval)
        this.ctx.threadResult!.up = this._result
        this.onFinish?.(this.ctx.threadResult!)
    }

    writeData(): void {
        const msg = `${ESocketMessage.PUT}${
            this.ctx.chunkSize === this.ctx.defaultChunkSize
                ? "\n"
                : ` ${this.ctx.chunkSize}\n`
        }`
        Logger.I.info(ELoggerMessage.T_SENDING_MESSAGE, this.ctx.index, msg)
        this.ctx.client.write(msg)
        this.ctx.client.on("drain", this.putChunks)
        this._interimHandlerInterval = setInterval(this.interimCheck, 100)
    }

    interimCheck = () => {
        if (this.ctx.threadResult)
            this.ctx.interimHandler?.(this.ctx.threadResult!)
    }

    readData(data: Buffer): void {
        if (data.indexOf(ESocketMessage.OK) === 0) {
            this.setActivityInterval()
            this.putChunks()
            return
        }
        if (data.indexOf(ESocketMessage.TIME) === 0) {
            const dataArr = data.toString().trim().split(" ")
            if (dataArr.length === 4) {
                const nanos = +dataArr[1]
                const bytes = +dataArr[3]
                this._result.addResult(bytes, nanos)
                this.ctx.threadResult!.up = this._result
                this.ctx.threadResult!.currentTime.up = nanos
                this.ctx.threadResult!.currentTransfer.up = bytes
            }
            return
        }
        if (data.includes(ESocketMessage.ACCEPT_GETCHUNKS)) {
            this.stopMessaging()
            return
        }
    }

    private putChunks = () => {
        let bufferIndex = 0
        while (this._isRunning) {
            let buffer = this._buffers[bufferIndex]!
            if (bufferIndex >= this._buffers.length - 1) {
                bufferIndex = 0
            } else {
                bufferIndex++
            }
            if (Time.nowNs() >= this._uploadEndTimeNs) {
                buffer[buffer.length - 1] = 0xff
                this.ctx.client.write(buffer)
                this._isRunning = false
                if (!this._finalTimeout) {
                    this._finalTimeout = setTimeout(
                        this.stopMessaging.bind(this),
                        UploadMessageHandler.waitForAllChunksTimeMs
                    )
                }
                break
            } else {
                buffer[buffer.length - 1] = 0x00
                this.ctx.client.write(buffer)
                this._bytesWritten += buffer.length
                if (this._bytesWritten >= this.waterMark) {
                    this._bytesWritten = 0
                    break
                }
            }
        }
    }

    private setActivityInterval() {
        const uploadDuration = Number(this.ctx.params.test_duration) * 1e9
        this._uploadEndTimeNs = Time.nowNs() + uploadDuration
    }
}
