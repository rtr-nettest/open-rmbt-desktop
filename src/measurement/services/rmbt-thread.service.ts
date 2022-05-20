import { Socket } from "net"
import { MeasurementResult } from "../dto/measurement-result.dto"
import { ESocketMessage } from "../enums/socket-message.enum"
import { IMeasurementRegistrationResponse } from "../interfaces/measurement-registration-response.interface"
import { IMeasurementResult } from "../interfaces/measurement-result.interface"

export class RMBTThreadService {
    currentTransfer: number = -1
    currentTime: number = -1
    private client: Socket = new Socket()
    private index: number
    private params: IMeasurementRegistrationResponse
    private result?: IMeasurementResult
    private in = 0
    private out = 0
    private totalDown = 0
    private totalUp = 0
    private chunksize: number = 0
    private onInitEnd?: (isInitialized: boolean) => void
    private onPreDownloadEnd?: (chunks: number) => void
    private preDownloadChunks = 1
    private preDownloadEndTime = process.hrtime.bigint()
    private preDownloadDuration = 2000000000n
    private preDownloadBytesRead = Buffer.alloc(0)
    private phase: "predownload" | "preupload" | undefined

    constructor(params: IMeasurementRegistrationResponse, index: number) {
        this.params = params
        this.index = index

        this.client.on("data", this.dataListener.bind(this))
        this.client.on("error", this.errorListener.bind(this))
        this.client.on("end", this.endListener.bind(this))
        this.client.on("close", this.closeListener.bind(this))
    }

    async connect() {
        this.result = new MeasurementResult()
        console.log(
            `Thread ${this.index} is connecting on host ${this.params.test_server_address}, port ${this.params.test_server_port}...`
        )
        await new Promise((resolve) => {
            this.client.connect(
                this.params.test_server_port,
                this.params.test_server_address,
                () => resolve(true)
            )
        })
        console.log(`Thread ${this.index} is connected.`)
        this.result.ip_local = this.client.localAddress
        this.result.ip_server = this.client.remoteAddress
        this.result.port_remote = this.client.remotePort
        if (this.in) {
            this.totalDown += this.in
        }
        if (this.out) {
            this.totalUp += this.out
        }
        this.in = 0
        this.out = 0
        // TODO: this is pulled from the Android app for RMBTHttp, and should handle measurements on ports 80 and 443, but is not working
        // if (this.params.test_server_type === "RMBThttp") {
        //     console.log(`Thread ${this.index} is requesting HTTP upgrade...`)
        //     this.client.write(Buffer.from(ESocketMessage.HTTP_UPGRADE, "ascii"))
        // }
        return this
    }

    disconnect() {
        this.client.end()
    }

    private dataListener(data: Buffer) {
        let dataString = data.length < 256 ? data.toString().trim() : ""
        if (dataString.length) {
            console.log(`Thread ${this.index} received string:`, dataString)
        } else {
            console.log(
                `Thread ${this.index} received bytes of length ${data.length}`
            )
        }
        switch (true) {
            case dataString.includes(ESocketMessage.GREETING):
                const versionMatches = new RegExp(/RMBTv([0-9.]+)/).exec(
                    dataString
                )
                if (this.result && versionMatches?.[1])
                    this.result.client_version = versionMatches[1]
                break
            case dataString.includes(ESocketMessage.ACCEPT_TOKEN):
                console.log(
                    `Thread ${this.index} sends token:`,
                    this.params.test_token
                )
                this.client.write(
                    `${ESocketMessage.TOKEN} ${this.params.test_token}`,
                    "ascii"
                )
                break
            case dataString.includes(ESocketMessage.CHUNKSIZE):
                const chunksize = Number(dataString.split(" ")[1])
                if (!this.chunksize) {
                    this.chunksize = chunksize
                    console.log(
                        `Setting chunksize ${chunksize} for the thread ${this.index}.`
                    )
                }
                this.onInitEnd?.(true)
                break
            case this.phase === "predownload":
                if (dataString.includes(ESocketMessage.ACCEPT_GETCHUNKS)) {
                    if (process.hrtime.bigint() < this.preDownloadEndTime) {
                        this.preDownloadChunks *= 2
                        console.log(
                            `Thread ${this.index} getting ${this.preDownloadChunks} chunks.`
                        )
                        this.client.write(
                            `${ESocketMessage.GETCHUNKS} ${this.preDownloadChunks}\n`,
                            "ascii"
                        )
                    } else {
                        console.log(
                            `Predownload is finished for thread ${this.index}`
                        )
                        this.phase = undefined
                        this.onPreDownloadEnd?.(this.preDownloadChunks)
                    }
                    break
                }
                if (dataString.includes(ESocketMessage.TIME)) {
                    break
                }
                let lastByte = 0
                let isFullChunk = false
                if (data.length > 0) {
                    this.preDownloadBytesRead = Buffer.alloc(
                        this.preDownloadBytesRead.byteLength + data.byteLength
                    )
                    isFullChunk =
                        this.preDownloadBytesRead.byteLength %
                            this.chunksize ===
                        0
                    lastByte = data[data.length - 1]
                }
                if (isFullChunk && lastByte === 0xff) {
                    console.log(
                        `Thread ${this.index} is ${ESocketMessage.OK}Continuing.`
                    )
                    this.client.write(ESocketMessage.OK)
                }
            default:
                break
        }
    }

    private errorListener(err: Error) {
        console.error(`Thread ${this.index} reported an error:`, err.message)
    }

    private endListener() {
        console.log(`Transmission was ended on the thread ${this.index}.`)
    }

    private closeListener(hadError: boolean) {
        console.log(
            `Connection was closed for the thread ${this.index}`,
            hadError ? "with error." : "."
        )
    }

    async waitForInit(): Promise<boolean> {
        return new Promise((resolve) => {
            this.onInitEnd = resolve
        })
    }

    async waitForPreDownload(): Promise<number> {
        return new Promise((resolve) => {
            this.onPreDownloadEnd = resolve
            this.preDownloadBytesRead = Buffer.alloc(0)
            this.preDownloadChunks = 1
            this.preDownloadEndTime =
                process.hrtime.bigint() + this.preDownloadDuration
            this.phase = "predownload"
            console.log(
                `Thread ${this.index} getting ${this.preDownloadChunks} chunks.`
            )
            this.client.write(
                `${ESocketMessage.GETCHUNKS} ${this.preDownloadChunks}\n`,
                "ascii"
            )
        })
    }
}
