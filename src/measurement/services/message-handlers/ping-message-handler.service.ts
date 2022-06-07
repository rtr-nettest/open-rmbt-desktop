import { ESocketMessage } from "../../enums/socket-message.enum"
import {
    IMeasurementThreadResult,
    IPing,
} from "../../interfaces/measurement-result.interface"
import {
    IMessageHandler,
    IMessageHandlerContext,
} from "../../interfaces/message-handler.interface"
import { Logger } from "../logger.service"
import { Time } from "../time.service"

export class PingMessageHandler implements IMessageHandler {
    private serverPings: bigint[] = []
    private pingCurrentStartTime = Time.nowNs()
    private pingCurrentEndTime = Time.nowNs()
    private pingCounter = 0

    constructor(
        private ctx: IMessageHandlerContext,
        public onFinish: (result: IMeasurementThreadResult) => void
    ) {}

    stopMessaging(): void {
        this.serverPings.sort()
        const middle = this.serverPings.length / 2
        if (this.serverPings.length % 2 === 0) {
            const medianA = this.serverPings[middle]
            const medianB = this.serverPings[middle - 1]
            this.ctx.threadResult.ping_median = (medianA + medianB) / 2n
        } else {
            this.ctx.threadResult.ping_median =
                this.serverPings[Math.floor(middle)]
        }
        this.onFinish?.(this.ctx.threadResult)
    }

    writeData() {
        this.pingCurrentStartTime = Time.nowNs()
        this.ctx.client.write(Buffer.from(ESocketMessage.PING, "ascii"))
        Logger.I.info(
            `Thread ${this.ctx.index} sent ${ESocketMessage.PING.replace(
                "\n",
                ""
            )} #${this.pingCounter + 1}`
        )
        this.pingCounter += 1
    }

    readData(data: Buffer) {
        if (data.includes(ESocketMessage.PONG)) {
            this.pingCurrentEndTime = Time.nowNs()
            Logger.I.info(
                `Thread ${this.ctx.index} is ${ESocketMessage.OK}Continuing.`
            )
            this.ctx.client.write(ESocketMessage.OK)
            return
        }
        if (data.includes(ESocketMessage.TIME)) {
            const timeMatches = new RegExp(/TIME ([0-9]+)/).exec(
                data.toString().trim()
            )

            const ping: IPing = {
                client: this.pingCurrentEndTime - this.pingCurrentStartTime,
                server: timeMatches?.[1] ? BigInt(timeMatches[1]) : 0n,
                timeNs: this.pingCurrentStartTime,
            }

            if (
                ping.client < (this.ctx.threadResult.ping_shortest || Infinity)
            ) {
                this.ctx.threadResult.ping_shortest = ping.client
            }
            this.serverPings.push(ping.server)
        }
        if (data.includes(ESocketMessage.ACCEPT_GETCHUNKS)) {
            if (this.pingCounter < (this.ctx.params.test_numpings ?? 0)) {
                this.writeData()
            } else {
                this.stopMessaging()
            }
            return
        }
    }
}
