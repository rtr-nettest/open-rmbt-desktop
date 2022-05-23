import { Socket } from "net"
import { MeasurementResult } from "../dto/measurement-result.dto"
import { ESocketMessage } from "../enums/socket-message.enum"
import { IMeasurementRegistrationResponse } from "../interfaces/measurement-registration-response.interface"
import { IMeasurementResult } from "../interfaces/measurement-result.interface"
import { PingMessageHandler } from "./ping-message-handler.service"
import { PreDownloadMessageHandler } from "./pre-download-message-handler.service"

export class RMBTThreadService {
    currentTransfer: number = -1
    currentTime: number = -1
    private client: Socket = new Socket()
    private index: number
    private params: IMeasurementRegistrationResponse
    private result: IMeasurementResult = new MeasurementResult()
    private in = 0
    private out = 0
    private totalDown = 0
    private totalUp = 0
    private chunksize: number = 0
    private onInitEnd?: (isInitialized: boolean) => void
    private phase: "predownload" | "ping" | "preupload" | undefined
    private pingMessageHandler?: PingMessageHandler
    private preDownloadMessageHandler?: PreDownloadMessageHandler

    constructor(params: IMeasurementRegistrationResponse, index: number) {
        this.params = params
        this.index = index

        this.initClient()
    }

    initClient() {
        // TODO: implement secure connection
        // this.client = new TLSSocket(this.socket)
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
        let dataString = data.length < 128 ? data.toString().trim() : ""
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
            case dataString.includes(ESocketMessage.ACCEPT_TOKEN):
                console.log(
                    `Thread ${this.index} sends token:`,
                    this.params.test_token
                )
                this.client.write(
                    `${ESocketMessage.TOKEN} ${this.params.test_token}\n`,
                    "ascii"
                )
                break
            case dataString.includes(ESocketMessage.CHUNKSIZE):
                this.setChunkSize(dataString)
                break
            case this.phase === "predownload":
                this.preDownloadMessageHandler?.readData(data)
                break
            case this.phase === "ping":
                this.pingMessageHandler?.readData(data)
                break
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

    async manageInit(): Promise<boolean> {
        return new Promise((resolve) => {
            this.onInitEnd = resolve
        })
    }

    async managePreDownload(): Promise<number> {
        return new Promise((resolve) => {
            this.phase = "predownload"
            this.preDownloadMessageHandler = new PreDownloadMessageHandler(
                resolve,
                this.client,
                this.index,
                this.chunksize,
                this.in
            )
            this.preDownloadMessageHandler.writeData()
        })
    }

    async managePing(): Promise<bigint> {
        return new Promise((resolve) => {
            this.phase = "ping"
            this.pingMessageHandler = new PingMessageHandler(
                resolve,
                this.client,
                this.index,
                this.params,
                this.result
            )
            this.pingMessageHandler.writeData()
        })
    }

    private setChunkSize(dataString: string) {
        const chunksize = Number(dataString.split(" ")[1])
        if (!this.chunksize) {
            this.chunksize = chunksize
            console.log(
                `Setting chunksize ${chunksize} for the thread ${this.index}.`
            )
        }
        this.onInitEnd?.(true)
    }
}
