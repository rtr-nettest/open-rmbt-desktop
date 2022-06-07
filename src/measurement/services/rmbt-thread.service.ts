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
import { IMessageHandlerContext } from "../interfaces/message-handler.interface"

export class RMBTThreadService implements IMessageHandlerContext {
    chunksize: number = 0
    client: net.Socket = new net.Socket()
    currentTime: bigint = -1n
    currentTransfer: number = -1
    index: number
    params: IMeasurementRegistrationResponse
    threadResult: IMeasurementThreadResult = new MeasurementThreadResult()
    preDownloadChunks?: number | undefined
    preUploadChunks?: number | undefined
    private totalPreDownload = 0
    private totalDownload = 0
    private totalPreUpload = 0
    private totalUpload = 0
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
            this.threadResult = result
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
            Logger.I.info(`Thread ${this.index} is disconnecting.`)
            this.isConnected = false
            this.onDisconnect = resolve
            this.client.end()
        })
    }

    private connectionListener =
        (resolve: (thread: RMBTThreadService) => void) => () => {
            Logger.I.info(`Thread ${this.index} is connected.`)
            this.isConnected = true
            this.hadError = false
            this.threadResult.ip_local = this.client.localAddress
            this.threadResult.ip_server = this.client.remoteAddress
            this.threadResult.port_remote = this.client.remotePort
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

        switch (this.phase) {
            case "preupload":
                this.preUploadMessageHandler?.stopMessaging()
                break
            case "upload":
                this.uploadMessageHandler?.stopMessaging()
                break
        }
    }

    async manageInit(): Promise<IMeasurementThreadResult> {
        return new Promise((resolve) => {
            this.phase = "init"
            this.initMessageHandler = new InitMessageHandler(this, (result) => {
                this.initMessageHandler = undefined
                this.chunksize = this.threadResult.chunksize || 0
                delete this.threadResult.chunksize
                Logger.I.info(`Resolving thread ${this.index} init.`)
                resolve(result)
            })
            this.initMessageHandler.writeData()
        })
    }

    async managePreDownload(): Promise<number> {
        return new Promise((resolve) => {
            this.phase = "predownload"
            this.preDownloadMessageHandler = new PreDownloadMessageHandler(
                this,
                (result) => {
                    this.preDownloadMessageHandler = undefined
                    this.totalPreDownload = result.totalDownload
                    this.preDownloadChunks = result.chunks
                    Logger.I.info(
                        `Resolving thread ${this.index} pre-download.`
                    )
                    resolve(result.chunks)
                }
            )
            this.preDownloadMessageHandler.writeData()
        })
    }

    async managePing(): Promise<IMeasurementThreadResult> {
        return new Promise((resolve) => {
            this.phase = "ping"
            this.pingMessageHandler = new PingMessageHandler(this, (result) => {
                this.pingMessageHandler = undefined
                Logger.I.info(`Resolving thread ${this.index} ping.`)
                resolve(result)
            })
            this.pingMessageHandler.writeData()
        })
    }

    async manageDownload(): Promise<IMeasurementThreadResult> {
        return new Promise((resolve) => {
            this.phase = "download"
            this.downloadMessageHandler = new DownloadMessageHandler(
                this,
                (total, currentTime) => {
                    this.totalDownload = total
                    this.currentTransfer = total
                    this.currentTime = currentTime
                },
                (result) => {
                    this.downloadMessageHandler = undefined
                    this.disconnect().then(() => {
                        Logger.I.info(
                            `Resolving thread ${this.index} download.`
                        )
                        resolve(result)
                    })
                }
            )
            this.downloadMessageHandler.writeData()
        })
    }

    async managePreUpload(): Promise<number> {
        return new Promise((resolve) => {
            this.phase = "preupload"
            this.preUploadMessageHandler = new PreUploadMessageHandler(
                this,
                (result) => {
                    this.preUploadMessageHandler = undefined
                    this.totalPreUpload = result.totalUpload
                    this.preUploadChunks = result.chunks
                    this.disconnect().then(() => {
                        Logger.I.info(
                            `Resolving thread ${this.index} pre-upload.`
                        )
                        resolve(result.chunks)
                    })
                }
            )
            this.preUploadMessageHandler.writeData()
        })
    }

    async manageUpload(): Promise<IMeasurementThreadResult> {
        return new Promise((resolve) => {
            this.phase = "upload"
            this.currentTransfer = 0
            this.currentTime = 0n
            this.uploadMessageHandler = new UploadMessageHandler(
                this,
                (total, currentTime) => {
                    this.totalUpload = total
                    this.currentTransfer = total
                    this.currentTime = currentTime
                },
                (result) => {
                    this.uploadMessageHandler = undefined
                    this.disconnect().then(() => {
                        Logger.I.info(`Resolving thread ${this.index} upload.`)
                        resolve(result)
                    })
                }
            )
            this.uploadMessageHandler.writeData()
        })
    }
}
