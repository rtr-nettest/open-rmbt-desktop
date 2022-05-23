import { Socket } from "net"
import { hrtime } from "process"
import { ESocketMessage } from "../enums/socket-message.enum"
import { IMessageHandler } from "../interfaces/message-handler.interface"

export class PreDownloadMessageHandler implements IMessageHandler {
    private preDownloadChunks = 1
    private preDownloadEndTime = hrtime.bigint()
    private preDownloadDuration = 2000000000n
    private preDownloadBytesRead = Buffer.alloc(0)

    constructor(
        public onFinish: (chunks: number) => void,
        private client: Socket,
        private index: number,
        private chunksize: number,
        private input: number
    ) {}

    writeData(): void {
        this.preDownloadBytesRead = Buffer.alloc(0)
        this.preDownloadChunks = 1
        this.preDownloadEndTime = hrtime.bigint() + this.preDownloadDuration
        console.log(
            `Thread ${this.index} getting ${this.preDownloadChunks} chunks.`
        )
        this.client.write(
            `${ESocketMessage.GETCHUNKS} ${this.preDownloadChunks}\n`,
            "ascii"
        )
    }
    readData(data: Buffer): void {
        if (data.includes(ESocketMessage.ACCEPT_GETCHUNKS)) {
            if (hrtime.bigint() < this.preDownloadEndTime) {
                this.preDownloadChunks *= 2
                console.log(
                    `Thread ${this.index} getting ${this.preDownloadChunks} chunks.`
                )
                this.client.write(
                    `${ESocketMessage.GETCHUNKS} ${this.preDownloadChunks}\n`,
                    "ascii"
                )
            } else {
                console.log(`Predownload is finished for thread ${this.index}`)
                this.onFinish?.(this.preDownloadChunks)
            }
            return
        }
        if (data.includes(ESocketMessage.TIME)) {
            return
        }
        let lastByte = 0
        let isFullChunk = false
        if (data.length > 0) {
            this.preDownloadBytesRead = Buffer.alloc(
                this.preDownloadBytesRead.byteLength + data.byteLength
            )
            isFullChunk =
                this.preDownloadBytesRead.byteLength % this.chunksize === 0
            lastByte = data[data.length - 1]
            this.input = this.preDownloadBytesRead.byteLength
        }
        if (isFullChunk && lastByte === 0xff) {
            console.log(
                `Thread ${this.index} is ${ESocketMessage.OK}Continuing.`
            )
            this.client.write(ESocketMessage.OK)
        }
    }
}
