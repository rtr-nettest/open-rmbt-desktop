import { SingleThreadResult } from "../../dto/single-thread-result.dto"
import { ESocketMessage } from "../../enums/socket-message.enum"
import { IMeasurementThreadResult } from "../../interfaces/measurement-result.interface"
import {
    IMessageHandler,
    IMessageHandlerContext,
} from "../../interfaces/message-handler.interface"
import { Logger } from "../logger.service"
import { Time } from "../time.service"

const lag = require("event-loop-lag")(1000)

export class DownloadMessageHandler implements IMessageHandler {
    static minDiffTime = 100000000
    private downloadStartTime = Time.nowNs()
    private downloadEndTime = Time.nowNs()
    private downloadBytesRead = 0
    private activityInterval?: NodeJS.Timer
    private inactivityTimeout = 0
    private result = new SingleThreadResult(0)
    private nsec = 0

    constructor(
        private ctx: IMessageHandlerContext,
        private setIntermidiateResults: (
            currentTransfer: number,
            currentTime: number
        ) => void,
        public onFinish: (result: IMeasurementThreadResult) => void
    ) {
        const maxStoredResults =
            (Number(this.ctx.params.test_duration) * 1e9) /
            DownloadMessageHandler.minDiffTime
        this.result = new SingleThreadResult(Number(maxStoredResults))
        this.inactivityTimeout = Number(this.ctx.params.test_duration) * 1000
    }

    stopMessaging() {
        clearInterval(this.activityInterval)
        Logger.I.info(`Download is stoped for thread ${this.ctx.index}`)
        this.ctx.threadResult.down = this.result.getAllResults()
        this.ctx.threadResult.speedItems = this.result.addSpeedItems(
            this.ctx.threadResult.speedItems,
            false,
            this.ctx.index
        )
        this.onFinish?.(this.ctx.threadResult)
    }

    writeData(): void {
        this.downloadStartTime = Time.nowNs()
        this.downloadEndTime =
            this.downloadStartTime + Number(this.ctx.params.test_duration) * 1e9
        this.activityInterval = setInterval(() => {
            Logger.I.info(`Checking activity on thread ${this.ctx.index}...`)
            if (Time.nowNs() > this.downloadEndTime) {
                Logger.I.info(`Thread ${this.ctx.index} timed out.`)
                this.requestFinish()
            }
        }, this.inactivityTimeout)
        Logger.I.info(
            `Thread ${this.ctx.index} will run download for ${this.ctx.params.test_duration} seconds.`
        )
        this.ctx.client.write(
            `${ESocketMessage.GETTIME} ${this.ctx.params.test_duration}\n`
        )
    }
    readData(data: Buffer): void {
        if (data.includes(ESocketMessage.ACCEPT_GETCHUNKS)) {
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

            this.nsec = Time.nowNs() - this.downloadStartTime - lag() * 1e6
            this.result.addResult(this.downloadBytesRead, this.nsec)

            isFullChunk = this.downloadBytesRead % this.ctx.chunksize === 0

            lastByte = data[data.length - 1]

            this.setIntermidiateResults?.(this.downloadBytesRead, this.nsec)
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
        this.ctx.client.write(ESocketMessage.OK)
    }
}
