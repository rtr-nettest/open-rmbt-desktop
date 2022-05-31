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
import { PreUploadMessageHandler } from "./pre-upload-message-handler.service"
import { InitMessageHandler } from "./init-message-handler.service"
import { UploadMessageHandler } from "./upload-message-handler.service"

export class RMBTThreadService {
    currentTransfer: number = -1
    currentTime: bigint = -1n
    private client: net.Socket = new net.Socket()
    private index: number
    private params: IMeasurementRegistrationResponse
    private result: IMeasurementThreadResult = new MeasurementThreadResult()
    private totalPreDownload = 0
    private totalDownload = 0
    private totalPreUpload = 0
    private totalUpload = 0
    private chunksize: number = 0
    private phase?:
        | "init"
        | "predownload"
        | "ping"
        | "download"
        | "preupload"
        | "upload"
    private initMessageHandler?: InitMessageHandler
    private pingMessageHandler?: PingMessageHandler
    private preDownloadMessageHandler?: PreDownloadMessageHandler
    private downloadMessageHandler?: DownloadMessageHandler
    private preUploadMessageHandler?: PreUploadMessageHandler
    private uploadMessageHandler?: UploadMessageHandler
    private onDisconnect?: (thread: RMBTThreadService) => void
    private hadError = false
    private isConnected = false

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

    async disconnect(): Promise<RMBTThreadService> {
        return new Promise((resolve) => {
            if (!this.isConnected) {
                resolve(this)
            }
            this.onDisconnect = resolve
            this.client.end()
        })
    }

    private connectionListener =
        (resolve: (thread: RMBTThreadService) => void) => () => {
            Logger.I.info(`Thread ${this.index} is connected.`)
            this.isConnected = true
            this.hadError = false
            this.result.ip_local = this.client.localAddress
            this.result.ip_server = this.client.remoteAddress
            this.result.port_remote = this.client.remotePort
            resolve(this)
        }

    private dataListener(data: Buffer) {
        let dataString = data.length < 128 ? data.toString().trim() : ""
        if (dataString.length) {
            Logger.I.info(
                `Thread ${this.index} received string: %s`,
                dataString
            )
        } else {
            Logger.I.info(
                `Thread ${this.index} received bytes of length ${data.byteLength}`
            )
        }
        if (dataString.includes(ESocketMessage.ERR)) {
            this.hadError = true
        }
        switch (true) {
            case this.phase === "init":
                this.initMessageHandler?.readData(data)
                break
            case this.phase === "predownload":
                this.preDownloadMessageHandler?.readData(data)
                break
            case this.phase === "ping":
                this.pingMessageHandler?.readData(data)
                break
            case this.phase === "download":
                this.downloadMessageHandler?.readData(data)
                break
            case this.phase === "preupload":
                this.preUploadMessageHandler?.readData(data)
                break
            case this.phase === "upload":
                this.uploadMessageHandler?.readData(data)
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
            hadError || this.hadError ? " with error" : ""
        )
        this.isConnected = false
        this.onDisconnect?.(this)
    }

    async manageInit(): Promise<IMeasurementThreadResult> {
        return new Promise((resolve) => {
            this.phase = "init"
            this.initMessageHandler = new InitMessageHandler(
                this.client,
                this.index,
                this.params,
                this.result,
                (result) => {
                    this.initMessageHandler = undefined
                    this.chunksize = this.result.chunksize || 0
                    delete this.result.chunksize
                    resolve(result)
                }
            )
            this.initMessageHandler.writeData()
        })
    }

    async managePreDownload(): Promise<number> {
        return new Promise((resolve) => {
            this.phase = "predownload"
            this.preDownloadMessageHandler = new PreDownloadMessageHandler(
                this.client,
                this.index,
                this.chunksize,
                (result) => {
                    this.preDownloadMessageHandler = undefined
                    this.totalPreDownload = result.totalDownload
                    resolve(result.chunks)
                }
            )
            this.preDownloadMessageHandler.writeData()
        })
    }

    async managePing(): Promise<IMeasurementThreadResult> {
        return new Promise((resolve) => {
            this.phase = "ping"
            this.pingMessageHandler = new PingMessageHandler(
                this.client,
                this.index,
                this.params,
                this.result,
                (result) => {
                    this.pingMessageHandler = undefined
                    resolve(result)
                }
            )
            this.pingMessageHandler.writeData()
        })
    }

    async manageDownload(): Promise<IMeasurementThreadResult> {
        return new Promise((resolve) => {
            this.phase = "download"
            this.downloadMessageHandler = new DownloadMessageHandler(
                this.client,
                this.index,
                this.chunksize,
                this.params,
                this.result,
                (total, currentTime) => {
                    this.totalDownload = this.totalPreDownload + total
                    this.currentTransfer = total
                    this.currentTime = currentTime
                },
                (result) => {
                    this.downloadMessageHandler = undefined
                    this.disconnect().then(() => resolve(result))
                }
            )
            this.downloadMessageHandler.writeData()
        })
    }

    async managePreUpload(): Promise<number> {
        return new Promise((resolve) => {
            this.phase = "preupload"
            this.preUploadMessageHandler = new PreUploadMessageHandler(
                this.client,
                this.index,
                this.chunksize,
                (result) => {
                    this.preUploadMessageHandler = undefined
                    this.totalPreUpload = result.totalUpload
                    resolve(result.chunks)
                }
            )
            this.preUploadMessageHandler.writeData()
        })
    }

    async manageUpload(): Promise<IMeasurementThreadResult> {
        return new Promise((resolve) => {
            this.phase = "upload"
            this.uploadMessageHandler = new UploadMessageHandler(
                this.client,
                this.index,
                this.chunksize,
                this.params,
                this.result,
                (total, currentTime) => {
                    this.totalUpload = this.totalPreUpload + total
                    this.currentTransfer = total
                    this.currentTime = currentTime
                },
                (result) => {
                    this.uploadMessageHandler = undefined
                    this.disconnect().then(() => resolve(result))
                }
            )
            this.uploadMessageHandler.writeData()
        })
    }
}
