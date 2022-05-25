import net from "net"
import tls from "tls"
import fs from "fs"
import { MeasurementThreadResult } from "../dto/measurement-result.dto"
import { ESocketMessage } from "../enums/socket-message.enum"
import { IMeasurementRegistrationResponse } from "../interfaces/measurement-registration-response.interface"
import { IMeasurementThreadResult } from "../interfaces/measurement-result.interface"
import { DownloadMessageHandler } from "./download-message-handler.service"
import { Logger } from "./logger.service"
import { PingMessageHandler } from "./ping-message-handler.service"
import { PreDownloadMessageHandler } from "./pre-download-message-handler.service"

export class RMBTThreadService {
    currentTransfer: number = -1
    currentTime: bigint = -1n
    private client: net.Socket = new net.Socket()
    private index: number
    private params: IMeasurementRegistrationResponse
    private result: IMeasurementThreadResult = new MeasurementThreadResult()
    private in = 0
    private out = 0
    private totalDown = 0
    private totalUp = 0
    private chunksize: number = 0
    private onInitEnd?: (isInitialized: boolean) => void
    private phase: "predownload" | "ping" | "download" | undefined
    private pingMessageHandler?: PingMessageHandler
    private preDownloadMessageHandler?: PreDownloadMessageHandler
    private downloadMessageHandler?: DownloadMessageHandler

    constructor(params: IMeasurementRegistrationResponse, index: number) {
        this.params = params
        this.index = index
    }

    async connect(
        result: IMeasurementThreadResult
    ): Promise<RMBTThreadService> {
        return new Promise((resolve) => {
            this.result = result
            Logger.I.info(
                `Thread ${this.index} is connecting on host ${this.params.test_server_address}, port ${this.params.test_server_port}...`
            )
            const options: net.NetConnectOpts & tls.ConnectionOptions = {
                host: this.params.test_server_address,
                port: this.params.test_server_port,
            }
            if (process.env.SSL_KEY_PATH && process.env.SSL_CERT_PATH) {
                options.key = fs.readFileSync(process.env.SSL_KEY_PATH)
                options.cert = fs.readFileSync(process.env.SSL_CERT_PATH)
            }
            if (this.params.test_server_encryption) {
                this.client = tls.connect(options)
            } else {
                this.client = net.createConnection(options)
            }
            this.client.on("data", this.dataListener.bind(this))
            this.client.on("error", this.errorListener.bind(this))
            this.client.on("end", this.endListener.bind(this))
            this.client.on("close", this.closeListener.bind(this))
            this.client.on(
                "connect",
                this.connectionListener.call(this, resolve)
            )
        })
    }

    disconnect(): RMBTThreadService {
        this.client.end()
        return this
    }

    private connectionListener =
        (resolve: (thread: RMBTThreadService) => void) => () => {
            Logger.I.info(`Thread ${this.index} is connected.`)
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
            if (this.params.test_server_type === "RMBThttp") {
                Logger.I.info(
                    `Thread ${this.index} is requesting HTTP upgrade...`
                )
                this.client.write(ESocketMessage.HTTP_UPGRADE, "ascii")
            }
            resolve(this)
        }

    private dataListener(data: Buffer) {
        let dataString = data.length < 128 ? data.toString().trim() : ""
        if (dataString.length) {
            Logger.I.info(`Thread ${this.index} received string:`, dataString)
        } else {
            Logger.I.info(
                `Thread ${this.index} received bytes of length ${data.byteLength}`
            )
        }
        switch (true) {
            // TODO: InitMessageHandler
            case dataString.includes(ESocketMessage.GREETING):
                const versionMatches = new RegExp(/RMBTv([0-9.]+)/).exec(
                    dataString
                )
                if (this.result && versionMatches?.[1])
                    this.result.client_version = versionMatches[1]
            case dataString.includes(ESocketMessage.ACCEPT_TOKEN):
                Logger.I.info(
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
            // END TODO

            case this.phase === "predownload":
                this.preDownloadMessageHandler?.readData(data)
                break
            case this.phase === "ping":
                this.pingMessageHandler?.readData(data)
                break
            case this.phase === "download":
                this.downloadMessageHandler?.readData(data)
                break
            default:
                break
        }
    }

    private errorListener(err: Error) {
        Logger.I.error(
            `Thread ${this.index} reported an error: %s`,
            err.message
        )
    }

    private endListener() {
        Logger.I.info(`Transmission was ended on the thread ${this.index}.`)
    }

    private closeListener(hadError: boolean) {
        Logger.I.info(
            `Connection was closed for the thread ${this.index}%s.`,
            hadError ? " with error" : ""
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
                (input) => (this.in = input)
            )
            this.preDownloadMessageHandler.writeData()
        })
    }

    async managePing(): Promise<IMeasurementThreadResult> {
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

    async manageDownload(): Promise<IMeasurementThreadResult> {
        return new Promise((resolve) => {
            this.phase = "download"
            this.downloadMessageHandler = new DownloadMessageHandler(
                resolve,
                this.client,
                this.index,
                this.chunksize,
                this.params,
                this.result,
                (currentTransfer, currentTime) => {
                    this.in += currentTransfer
                    this.currentTransfer = currentTransfer
                    this.currentTime = currentTime
                }
            )
            this.downloadMessageHandler.writeData()
        })
    }

    private setChunkSize(dataString: string) {
        const chunksize = Number(dataString.split(" ")[1])
        if (!this.chunksize) {
            this.chunksize = chunksize
            Logger.I.info(
                `Setting chunksize ${chunksize} for the thread ${this.index}.`
            )
        }
        this.onInitEnd?.(true)
    }
}
