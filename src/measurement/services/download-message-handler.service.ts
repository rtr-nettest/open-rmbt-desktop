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
    private downloadDuration = 1000000000n
    private downloadBytesRead = Buffer.alloc(0)
    private activityInterval?: NodeJS.Timer
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
            (BigInt(this.params.test_duration) * 1000000000n) /
            DownloadMessageHandler.minDiffTime
        this.result = new SingleThreadResult(Number(maxStoredResults))
    }

    writeData(): void {
        this.downloadStartTime = hrtime.bigint()
        this.downloadEndTime =
            this.downloadStartTime +
            BigInt(this.params.test_duration) * this.downloadDuration
        this.activityInterval = setInterval(() => {
            Logger.I.info(`Checking activity on thread ${this.index}...`)
            if (hrtime.bigint() > this.downloadEndTime) {
                Logger.I.info(`Thread ${this.index} timed out.`)
                this.finishDownload()
            }
        }, 1000)
        Logger.I.info(
            `Thread ${this.index} will run download for ${this.params.test_duration} seconds.`
        )
        this.client.write(
            `${ESocketMessage.GETTIME} ${this.params.test_duration}\n`,
            "ascii"
        )
    }
    readData(data: Buffer): void {
        if (data.includes(ESocketMessage.ACCEPT_GETCHUNKS)) {
            Logger.I.info(`Download is finished for thread ${this.index}`)
            clearInterval(this.activityInterval)
            this.threadResult.down = this.result.getAllResults()
            this.threadResult.speedItems = this.result.getSpeedItems(
                false,
                this.index
            )
            this.onFinish?.(this.threadResult)
            return
        }
        if (data.includes(ESocketMessage.TIME)) {
            this.client.end()
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
            this.finishDownload()
        }
    }
    private finishDownload() {
        clearInterval(this.activityInterval)
        this.client.write(ESocketMessage.OK)
    }
}
