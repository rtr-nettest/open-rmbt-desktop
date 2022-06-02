import { randomBytes } from "crypto"
import { Socket } from "net"
import { hrtime } from "process"
import { SingleThreadResult } from "../dto/single-thread-result.dto"
import { ESocketMessage } from "../enums/socket-message.enum"
import { IMeasurementRegistrationResponse } from "../interfaces/measurement-registration-response.interface"
import { IMeasurementThreadResult } from "../interfaces/measurement-result.interface"
import { IMessageHandler } from "../interfaces/message-handler.interface"
import { DownloadMessageHandler } from "./download-message-handler.service"
import { Logger } from "./logger.service"

export class UploadMessageHandler implements IMessageHandler {
    private uploadEndTime = 0n
    private result = new SingleThreadResult(0)
    private activityInterval?: NodeJS.Timer
    private inactivityTimeout = 0

    constructor(
        private client: Socket,
        private index: number,
        private chunksize: number,
        private params: IMeasurementRegistrationResponse,
        private threadResult: IMeasurementThreadResult,
        private setIntermidiateResults: (
            currentTransfer: number,
            currentTime: bigint
        ) => void,
        public onFinish: (result: IMeasurementThreadResult) => void
    ) {
        const maxStoredResults =
            (BigInt(this.params.test_duration) * BigInt(1e9)) /
            DownloadMessageHandler.minDiffTime
        this.result = new SingleThreadResult(Number(maxStoredResults))
        this.inactivityTimeout = Number(this.params.test_duration) * 1000
    }

    stopMessaging(): void {
        clearInterval(this.activityInterval)
        Logger.I.info(`Upload is finished for thread ${this.index}`)
        this.threadResult.up = this.result.getAllResults()
        this.threadResult.speedItems = this.result.addSpeedItems(
            this.threadResult.speedItems,
            true,
            this.index
        )
        this.onFinish?.(this.threadResult)
    }

    writeData(): void {
        Logger.I.info(`Thread ${this.index} sending PUT.`)
        this.setActivityInterval()
        this.client.write(ESocketMessage.PUT)
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
        const buffer = randomBytes(this.chunksize)
        if (hrtime.bigint() >= this.uploadEndTime) {
            buffer[buffer.length - 1] = 0xff
            Logger.I.info(`Thread ${this.index} sending the last chunk.`)
        } else {
            buffer[buffer.length - 1] = 0x00
            Logger.I.info(`Thread ${this.index} sending a chunk.`)
        }
        this.client.write(buffer)
    }

    private setActivityInterval() {
        clearInterval(this.activityInterval)
        const uploadDuration = BigInt(this.params.test_duration) * BigInt(1e9)
        this.uploadEndTime = hrtime.bigint() + uploadDuration
        this.activityInterval = setInterval(() => {
            Logger.I.info(`Checking activity on thread ${this.index}...`)
            if (hrtime.bigint() > this.uploadEndTime) {
                Logger.I.info(`Thread ${this.index} timed out.`)
                this.stopMessaging()
            }
        }, this.inactivityTimeout)
    }
}
