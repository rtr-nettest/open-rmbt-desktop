import { ESocketMessage } from "../../enums/socket-message.enum"
import { IMeasurementThreadResult } from "../../interfaces/measurement-result.interface"
import {
    IMessageHandler,
    IMessageHandlerContext,
} from "../../interfaces/message-handler.interface"
import { Logger } from "../logger.service"
import { Time } from "../time.service"

export class PingMessageHandler implements IMessageHandler {
    private serverPings: number[] = []
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
            this.ctx.threadResult.ping_median = (medianA + medianB) / 2
        } else {
            this.ctx.threadResult.ping_median =
                this.serverPings[Math.floor(middle)]
        }
        this.onFinish?.(this.ctx.threadResult)
    }

    writeData() {
        this.pingCurrentStartTime = Time.nowNs()
        this.ctx.client.write(ESocketMessage.PING)
        Logger.I.info(
            `Thread ${this.ctx.index} sent ${ESocketMessage.PING.replace(
                "\n",
                ""
            )} #${this.pingCounter + 1}`
        )
        this.pingCounter += 1
    }

    readData(data: Buffer) {
        if (data.includes(ESocketMessage.ERR)) {
            Logger.I.info(
                `Thread ${this.ctx.index} received an error. Terminating.`
            )
            this.pingCurrentEndTime = Time.nowNs()
            const pingClient = this.setShortestPing()
            this.serverPings.push(pingClient)
            this.stopMessaging()
            return
        }
        if (data.includes(ESocketMessage.PONG)) {
            Logger.I.info(
                `Thread ${this.ctx.index} received a PONG. Continuing.`
            )
            this.pingCurrentEndTime = Time.nowNs()
            this.ctx.client.write(ESocketMessage.OK)
            return
        }
        if (data.includes(ESocketMessage.TIME)) {
            this.setShortestPing()

            const timeMatches = new RegExp(/TIME ([0-9]+)/).exec(
                data.toString().trim()
            )
            const pingServer = timeMatches?.[1] ? Number(timeMatches[1]) : -1
            this.serverPings.push(pingServer)
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

    private setShortestPing() {
        const pingTime = this.pingCurrentEndTime - this.pingCurrentStartTime
        if (pingTime < (this.ctx.threadResult.ping_shortest || Infinity)) {
            this.ctx.threadResult.ping_shortest = pingTime
        }
        return pingTime
    }
}
