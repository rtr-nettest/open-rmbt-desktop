import net from "net"
import tls from "tls"
import fs from "fs"
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
import { ELoggerMessage } from "../enums/logger-message.enum"

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
    interimHandler?: (interimResult: IMeasurementThreadResult) => void
    errorHandler?: (error: Error) => void
    isConnected = false
    threadResult?: IMeasurementThreadResult
    preDownloadChunks: number = 1
    preUploadChunks: number = 1
    phase?:
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

    constructor(
        public params: IMeasurementRegistrationResponse,
        public index: number
    ) {}

    async connect(result: IMeasurementThreadResult): Promise<RMBTThread> {
        const host = this.params.test_server_address
        return new Promise((resolve) => {
            this.threadResult = result
            const options: net.NetConnectOpts & tls.ConnectionOptions = {
                host,
                port: this.params.test_server_port,
                rejectUnauthorized: false,
            }
            if (process.env.SSL_KEY_PATH && process.env.SSL_CERT_PATH) {
                options.key = fs.readFileSync(process.env.SSL_KEY_PATH)
                options.cert = fs.readFileSync(process.env.SSL_CERT_PATH)
            }
            Logger.I.info(
                ELoggerMessage.T_CONNECTING,
                this.index,
                host,
                this.params.test_server_port
            )
            if (this.params.test_server_encryption) {
                this.client = tls.connect(options)
            } else {
                this.client = net.createConnection(options)
            }
            // this.client.setNoDelay()
            this.client.on("data", this.dataListener)
            this.client.on("error", this.errorListener)
            this.client.on("end", this.endListener)
            this.client.on("close", this.closeListener)
            this.client.on("connect", this.connectionListener(resolve))
        })
    }

    async disconnect(): Promise<RMBTThread> {
        return new Promise((resolve) => {
            if (!this.isConnected) {
                resolve(this)
            }
            Logger.I.info(ELoggerMessage.T_DISCONNECTING, this.index)
            this.isConnected = false
            this.client.removeAllListeners()
            this.client.destroy()
            resolve(this)
        })
    }

    private connectionListener =
        (resolve: (thread: RMBTThread) => void) => () => {
            Logger.I.info(ELoggerMessage.T_CONNECTED, this.index)
            this.isConnected = true
            this.hadError = false
            resolve(this)
        }

    private dataListener = (data: Buffer) => {
        if (data.length < 128) {
            Logger.I.info(ELoggerMessage.T_RECEIVED_MESSAGE, this.index, data)
            if (data.includes(ESocketMessage.ERR)) {
                this.hadError = true
                this.errorListener(new Error(data.toString()))
            }
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

    private errorListener = (err: Error) => {
        Logger.I.error(ELoggerMessage.T_REPORTED_ERROR, this.index, err.message)
        // TODO: enable before going to prod
        // if (
        //     err.message.includes("ECONNRESET") &&
        //     (this.phase === "preupload" ||
        //         (this.phase === "upload" && this.threadResult?.up.bytes.length))
        // ) {
        //     return
        // }
        this.errorHandler?.(err)
    }

    private endListener = () => {
        Logger.I.info(ELoggerMessage.T_ENDED_TRANSMISSION, this.index)
    }

    private closeListener = (hadError: boolean) => {
        if (hadError) {
            Logger.I.info(
                ELoggerMessage.T_CLOSED_CONNECTION_WITH_ERROR,
                this.index
            )
        } else if (this.hadError) {
            Logger.I.info(
                ELoggerMessage.T_CLOSED_CONNECTION_WITH_ERR_MESSAGE,
                this.index
            )
        } else {
            Logger.I.info(ELoggerMessage.T_CLOSED_CONNECTION, this.index)
        }
        this.isConnected = false
        this.client.removeAllListeners()
        this.client.destroy()
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
                Logger.I.info(
                    ELoggerMessage.T_RESOLVING_PHASE,
                    this.index,
                    this.phase
                )

                this.dropHandlers()
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
                    Logger.I.info(
                        ELoggerMessage.T_RESOLVING_PHASE,
                        this.index,
                        this.phase
                    )
                    this.dropHandlers()
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
                Logger.I.info(
                    ELoggerMessage.T_RESOLVING_PHASE,
                    this.index,
                    this.phase
                )
                this.dropHandlers()
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
            Logger.I.info(
                ELoggerMessage.T_DONWLOAD_CHUNK_SIZE,
                this.index,
                this.chunkSize
            )
            this.dropHandlers()
            this.downloadMessageHandler = new DownloadMessageHandler(
                this,
                (result) => {
                    this.dropHandlers()
                    this.interimHandler = undefined
                    this.disconnect().then(() => {
                        Logger.I.info(
                            ELoggerMessage.T_RESOLVING_PHASE,
                            this.index,
                            "download"
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
                (chunkSize: number) => {
                    Logger.I.info(
                        ELoggerMessage.T_RESOLVING_PHASE,
                        this.index,
                        this.phase
                    )
                    this.dropHandlers()
                    resolve(chunkSize)
                }
            )
            this.preUploadMessageHandler.writeData()
        })
    }

    async manageUpload(chunkSize?: number): Promise<IMeasurementThreadResult> {
        return new Promise((resolve) => {
            this.phase = "upload"
            if (chunkSize) {
                this.chunkSize = chunkSize
            }
            Logger.I.info(
                ELoggerMessage.T_UPLOAD_CHUNK_SIZE,
                this.index,
                this.chunkSize
            )
            this.dropHandlers()
            this.uploadMessageHandler = new UploadMessageHandler(
                this,
                (result) => {
                    this.dropHandlers()
                    this.interimHandler = undefined
                    this.disconnect().then(() => {
                        Logger.I.info(
                            ELoggerMessage.T_RESOLVING_PHASE,
                            this.index,
                            "upload"
                        )
                        resolve(result)
                    })
                }
            )
            this.uploadMessageHandler.writeData()
        })
    }
}
