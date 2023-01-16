import net from "net"
import tls from "tls"
import fs from "fs"
import { MeasurementThreadResult } from "../dto/measurement-thread-result.dto"
import { ESocketMessage } from "../enums/socket-message.enum"
import { IMeasurementRegistrationResponse } from "../interfaces/measurement-registration-response.interface"
import { IMeasurementThreadResult } from "../interfaces/measurement-result.interface"
import { DownloadMessageHandler } from "./message-handlers/download-message-handler.service"
import { Logger } from "./logger.service"
import { PingMessageHandler } from "./message-handlers/ping-message-handler.service"
import { PreDownloadMessageHandler } from "./message-handlers/pre-download-message-handler.service"
import { PreUploadMessageHandler } from "./message-handlers/pre-upload-message-handler.service"
import { InitMessageHandler } from "./message-handlers/init-message-handler.service"
import { UploadMessageHandler } from "./message-handlers/upload-message-handler.service"
import { IMessageHandlerContext } from "../interfaces/message-handler.interface"

export interface IPreDownloadResult {
    chunkSize: number
    bytesPerSec: number
}

export class RMBTThread implements IMessageHandlerContext {
    static interimUpdatesIntervalMs = 100
    bytesPerSecPretest: number[] = []
    defaultChunkSize = 4096
    chunkSize: number = 0
    client: net.Socket = new net.Socket()
    currentTime: number = -1
    currentTransfer: number = -1
    interimHandler?: (interimResult: IMeasurementThreadResult) => void
    threadResult: IMeasurementThreadResult = new MeasurementThreadResult()
    preDownloadChunks: number = 1
    preUploadChunks: number = 1
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
    private hadError = false
    private isConnected = false

    constructor(
        public params: IMeasurementRegistrationResponse,
        public index: number
    ) {}

    async connect(result: IMeasurementThreadResult): Promise<RMBTThread> {
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

    async disconnect(): Promise<RMBTThread> {
        return new Promise((resolve) => {
            if (!this.isConnected) {
                resolve(this)
            }
            Logger.I.info(`Thread ${this.index} is disconnecting.`)
            this.isConnected = false
            this.client.end()
            resolve(this)
        })
    }

    private connectionListener =
        (resolve: (thread: RMBTThread) => void) => () => {
            Logger.I.info(`Thread ${this.index} is connected.`)
            this.isConnected = true
            this.hadError = false
            // this.threadResult.ip_local = this.client.localAddress
            // this.threadResult.ip_server = this.client.remoteAddress
            // this.threadResult.port_remote = this.client.remotePort
            resolve(this)
        }

    private dataListener(data: Buffer) {
        const dataString = data.length < 128 ? data.toString().trim() : ""
        if (dataString.includes(ESocketMessage.ERR)) {
            this.hadError = true
        }
        if (dataString.length) {
            Logger.I.info(`Thread ${this.index} received message ${dataString}`)
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

        switch (this.phase) {
            case "preupload":
                this.preUploadMessageHandler?.stopMessaging()
                break
            case "upload":
                this.uploadMessageHandler?.stopMessaging()
                break
        }
    }

    private dropHandlers() {
        this.initMessageHandler = undefined
        this.preDownloadMessageHandler = undefined
        this.pingMessageHandler = undefined
        this.downloadMessageHandler = undefined
        this.preUploadMessageHandler = undefined
        this.uploadMessageHandler = undefined
    }

    async manageInit(): Promise<boolean> {
        return new Promise((resolve) => {
            this.phase = "init"
            this.dropHandlers()
            this.initMessageHandler = new InitMessageHandler(this, (result) => {
                this.phase = undefined
                this.dropHandlers()
                Logger.I.info(`Resolving thread ${this.index} init.`)
                if (result) {
                    resolve(result)
                } else {
                    this.disconnect().then(() => resolve(result))
                }
            })
            this.initMessageHandler.writeData()
        })
    }

    async managePreDownload(): Promise<IPreDownloadResult> {
        return new Promise((resolve) => {
            this.phase = "predownload"
            this.dropHandlers()
            this.preDownloadMessageHandler = new PreDownloadMessageHandler(
                this,
                () => {
                    this.dropHandlers()
                    this.phase = undefined
                    Logger.I.info(
                        `Resolving thread ${this.index} pre-download.`
                    )
                    resolve({
                        chunkSize: this.chunkSize,
                        bytesPerSec: Math.max(...this.bytesPerSecPretest),
                    })
                }
            )
            this.preDownloadMessageHandler.writeData()
        })
    }

    async managePing(): Promise<IMeasurementThreadResult> {
        return new Promise((resolve) => {
            this.phase = "ping"
            this.dropHandlers()
            this.pingMessageHandler = new PingMessageHandler(this, (result) => {
                this.dropHandlers()
                this.phase = undefined
                Logger.I.info(`Resolving thread ${this.index} ping.`)
                resolve(result)
            })
            this.pingMessageHandler.writeData()
        })
    }

    async manageDownload(
        chunkSize?: number
    ): Promise<IMeasurementThreadResult> {
        return new Promise((resolve) => {
            this.phase = "download"
            if (chunkSize) {
                this.chunkSize = chunkSize
            }
            this.dropHandlers()
            this.downloadMessageHandler = new DownloadMessageHandler(
                this,
                (result) => {
                    this.dropHandlers()
                    this.phase = undefined
                    this.interimHandler = undefined
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
            this.dropHandlers()
            this.preUploadMessageHandler = new PreUploadMessageHandler(
                this,
                () => {
                    this.dropHandlers()
                    this.phase = undefined
                    this.disconnect().then(() => {
                        Logger.I.info(
                            `Resolving thread ${this.index} pre-upload.`
                        )
                        resolve(this.chunkSize)
                    })
                }
            )
            this.preUploadMessageHandler.writeData()
        })
    }

    async manageUpload(): Promise<IMeasurementThreadResult> {
        return new Promise((resolve) => {
            this.phase = "upload"
            this.dropHandlers()
            this.currentTransfer = 0
            this.currentTime = 0
            this.uploadMessageHandler = new UploadMessageHandler(
                this,
                (result) => {
                    this.dropHandlers()
                    this.phase = undefined
                    this.interimHandler = undefined
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
