import { ESocketMessage } from "../../enums/socket-message.enum"
import {
    IMessageHandler,
    IMessageHandlerContext,
} from "../../interfaces/message-handler.interface"
import { Logger } from "../logger.service"

export class InitMessageHandler implements IMessageHandler {
    private isInitialized = false
    private inactivityTimeout = 0

    constructor(
        private ctx: IMessageHandlerContext,
        public onFinish: (result: boolean) => void
    ) {
        this.inactivityTimeout = Number(this.ctx.params.test_duration) * 1e6
    }

    stopMessaging(): void {
        Logger.I.info(
            `Thread ${this.ctx.index} finished initialization ${
                this.isInitialized ? "successfully" : "with error"
            }.`
        )
        this.onFinish?.(this.isInitialized)
    }

    writeData(): void {
        if (this.ctx.params.test_server_type === "RMBThttp") {
            Logger.I.info(
                `Thread ${this.ctx.index} is requesting HTTP upgrade...`
            )
            this.ctx.client.write(ESocketMessage.HTTP_UPGRADE, "ascii")
        }
        setTimeout(() => {
            Logger.I.info(`Checking activity on thread ${this.ctx.index}...`)
            if (!this.isInitialized) {
                Logger.I.info(`Thread ${this.ctx.index} init timed out.`)
                this.stopMessaging()
            }
        }, this.inactivityTimeout)
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
                `Thread ${this.ctx.index} sends token: %s`,
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
                `Thread ${this.ctx.index} received chunksizes ${chunkSizes}.`
            )
            this.ctx.defaultChunkSize = +chunkSizes[1]
            this.ctx.chunkSize = +chunkSizes[1]
            return
        }
        if (dataString.includes(ESocketMessage.ACCEPT_GETCHUNKS)) {
            this.isInitialized = true
            this.stopMessaging()
            return
        }
    }
}
