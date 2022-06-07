import { ESocketMessage } from "../../enums/socket-message.enum"
import { IMeasurementThreadResult } from "../../interfaces/measurement-result.interface"
import {
    IMessageHandler,
    IMessageHandlerContext,
} from "../../interfaces/message-handler.interface"
import { Logger } from "../logger.service"

export class InitMessageHandler implements IMessageHandler {
    constructor(
        private ctx: IMessageHandlerContext,
        public onFinish: (result: IMeasurementThreadResult) => void
    ) {}

    stopMessaging(): void {
        Logger.I.info(`Thread ${this.ctx.index} finished initialization.`)
        this.onFinish?.(this.ctx.threadResult)
    }

    writeData(): void {
        if (this.ctx.params.test_server_type === "RMBThttp") {
            Logger.I.info(
                `Thread ${this.ctx.index} is requesting HTTP upgrade...`
            )
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
            this.ctx.threadResult.chunksize = Number(dataString.split(" ")[1])
            Logger.I.info(
                `Setting chunksize ${this.ctx.threadResult.chunksize} for the thread ${this.ctx.index}.`
            )
            return
        }
        if (dataString.includes(ESocketMessage.ACCEPT_GETCHUNKS)) {
            this.stopMessaging()
            return
        }
    }
}
