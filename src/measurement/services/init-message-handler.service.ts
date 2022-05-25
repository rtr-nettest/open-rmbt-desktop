import { Socket } from "net"
import { ESocketMessage } from "../enums/socket-message.enum"
import { IMeasurementRegistrationResponse } from "../interfaces/measurement-registration-response.interface"
import { IMeasurementThreadResult } from "../interfaces/measurement-result.interface"
import { IMessageHandler } from "../interfaces/message-handler.interface"
import { Logger } from "./logger.service"

export class InitMessageHandler implements IMessageHandler {
    constructor(
        private client: Socket,
        private index: number,
        private params: IMeasurementRegistrationResponse,
        private result: IMeasurementThreadResult,
        public onFinish: (result: IMeasurementThreadResult) => void
    ) {}

    writeData(): void {
        if (this.params.test_server_type === "RMBThttp") {
            Logger.I.info(`Thread ${this.index} is requesting HTTP upgrade...`)
            this.client.write(ESocketMessage.HTTP_UPGRADE, "ascii")
        }
    }
    readData(data: Buffer): void {
        const dataString = data.toString().trim()
        if (dataString.includes(ESocketMessage.GREETING)) {
            const versionMatches = new RegExp(/RMBTv([0-9.]+)/).exec(dataString)
            if (this.result && versionMatches?.[1])
                this.result.client_version = versionMatches[1]
            return
        }
        if (dataString.includes(ESocketMessage.ACCEPT_TOKEN)) {
            Logger.I.info(
                `Thread ${this.index} sends token: %s`,
                this.params.test_token
            )
            this.client.write(
                `${ESocketMessage.TOKEN} ${this.params.test_token}\n`,
                "ascii"
            )
            return
        }
        if (dataString.includes(ESocketMessage.CHUNKSIZE)) {
            this.result.chunksize = Number(dataString.split(" ")[1])
            Logger.I.info(
                `Setting chunksize ${this.result.chunksize} for the thread ${this.index}.`
            )
            return
        }
        if (dataString.includes(ESocketMessage.ACCEPT_GETCHUNKS)) {
            Logger.I.info(`Thread ${this.index} finished initialization.`)
            this.onFinish?.(this.result)
            return
        }
    }
}
