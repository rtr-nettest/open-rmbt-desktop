import { Socket } from "net"
import { hrtime } from "process"
import { SingleThreadResult } from "../dto/single-thread-result.dto"
import { ESocketMessage } from "../enums/socket-message.enum"
import { IMeasurementRegistrationResponse } from "../interfaces/measurement-registration-response.interface"
import { IMeasurementThreadResult } from "../interfaces/measurement-result.interface"
import { IMessageHandler } from "../interfaces/message-handler.interface"
import { Logger } from "./logger.service"

export class DownloadMessageHandler implements IMessageHandler {
    static minDiffTime = 100000000n
    private downloadStartTime = hrtime.bigint()
    private downloadEndTime = hrtime.bigint()
    private downloadBytesRead = Buffer.alloc(0)
    private activityInterval?: NodeJS.Timer
    private inactivityTimeout = 0
    private result = new SingleThreadResult(0)
    private nsec = 0n

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

    stopMessaging() {
        clearInterval(this.activityInterval)
        Logger.I.info(`Download is stoped for thread ${this.index}`)
        this.threadResult.down = this.result.getAllResults()
        this.threadResult.speedItems = this.result.addSpeedItems(
            this.threadResult.speedItems,
            false,
            this.index
        )
        this.onFinish?.(this.threadResult)
    }

    writeData(): void {
        this.downloadStartTime = hrtime.bigint()
        this.downloadEndTime =
            this.downloadStartTime +
            BigInt(this.params.test_duration) * BigInt(1e9)
        this.activityInterval = setInterval(() => {
            Logger.I.info(`Checking activity on thread ${this.index}...`)
            if (hrtime.bigint() > this.downloadEndTime) {
                Logger.I.info(`Thread ${this.index} timed out.`)
                this.requestFinish()
            }
        }, this.inactivityTimeout)
        Logger.I.info(
            `Thread ${this.index} will run download for ${this.params.test_duration} seconds.`
        )
        this.client.write(
            `${ESocketMessage.GETTIME} ${this.params.test_duration}\n`
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
            this.downloadBytesRead = Buffer.alloc(
                this.downloadBytesRead.byteLength + data.byteLength
            )

            this.nsec = hrtime.bigint() - this.downloadStartTime
            this.result.addResult(this.downloadBytesRead.byteLength, this.nsec)

            isFullChunk =
                this.downloadBytesRead.byteLength % this.chunksize === 0

            lastByte = data[data.length - 1]

            this.setIntermidiateResults?.(
                this.downloadBytesRead.byteLength,
                this.nsec
            )
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
        this.client.write(ESocketMessage.OK)
    }
}
