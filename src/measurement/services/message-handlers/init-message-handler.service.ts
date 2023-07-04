import { ELoggerMessage } from "../../enums/logger-message.enum"
import { ESocketMessage } from "../../enums/socket-message.enum"
import {
    IMessageHandler,
    IMessageHandlerContext,
} from "../../interfaces/message-handler.interface"
import { Logger } from "../logger.service"

export class InitMessageHandler implements IMessageHandler {
    private _isInitialized = false

    get isInitialized() {
        return this._isInitialized
    }

    constructor(
        private ctx: IMessageHandlerContext,
        public onFinish: (result: boolean) => void
    ) {}

    stopMessaging(): void {
        if (this._isInitialized) {
            Logger.I.info(ELoggerMessage.T_INIT_FINISHED, this.ctx.index)
        } else {
            Logger.I.info(
                ELoggerMessage.T_INIT_FINISHED_WITH_ERROR,
                this.ctx.index
            )
        }
        this.onFinish?.(this._isInitialized)
    }

    writeData(): void {
        if (this.ctx.params.test_server_type === "RMBThttp") {
            Logger.I.info(ELoggerMessage.T_REQUESTING_UPGRADE, this.ctx.index)
            this.ctx.client.write(ESocketMessage.HTTP_UPGRADE, "ascii")
        }
    }

    readData(data: Buffer): void {
        const dataString = data.toString().trim()
        if (dataString.includes(ESocketMessage.GREETING)) {
            const versionMatches = new RegExp(/RMBTv([0-9.]+)/).exec(dataString)
            if (this.ctx.threadResult && versionMatches?.[1])
                this.ctx.threadResult.client_version = versionMatches[1]
            return
        }
        if (dataString.includes(ESocketMessage.ACCEPT_TOKEN)) {
            Logger.I.info(
                ELoggerMessage.T_SENDING_TOKEN,
                this.ctx.index,
                this.ctx.params.test_token
            )
            this.ctx.client.write(
                `${ESocketMessage.TOKEN} ${this.ctx.params.test_token}\n`,
                "ascii"
            )
            return
        }
        if (dataString.includes(ESocketMessage.CHUNKSIZE)) {
            const chunkSizes = dataString.split(" ")
            Logger.I.info(
                ELoggerMessage.T_RECEIVED_CHUNK_SIZES,
                this.ctx.index,
                chunkSizes
            )
            this.ctx.defaultChunkSize = +chunkSizes[1]
            this.ctx.chunkSize = +chunkSizes[1]
            return
        }
        if (dataString.includes(ESocketMessage.ACCEPT_GETCHUNKS)) {
            this._isInitialized = true
            this.stopMessaging()
            return
        }
    }
}
