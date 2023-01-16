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
    private pingStartTime = Time.nowNs()
    private pingTimes: { start: number; end: number }[] = []
    private pingCounter = 0
    private isStopped = false

    constructor(
        private ctx: IMessageHandlerContext,
        public onFinish: (result: IMeasurementThreadResult) => void
    ) {}

    stopMessaging(): void {
        this.isStopped = true
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
        this.ctx.client.write(ESocketMessage.PING, () => {
            if (this.pingCounter === 0) {
                this.pingStartTime = Time.nowNs()
            }
            this.pingTimes.push({
                start: Time.nowNs(),
                end: 0,
            })
            Logger.I.info(
                `Thread ${this.ctx.index} sent ${ESocketMessage.PING.replace(
                    "\n",
                    ""
                )} #${this.pingCounter + 1}`
            )
            this.pingCounter += 1
        })
    }

    readData(data: Buffer) {
        if (this.isStopped) {
            return
        }
        if (data.includes(ESocketMessage.ERR)) {
            Logger.I.info(
                `Thread ${this.ctx.index} received an error. Terminating.`
            )
            this.pingTimes[this.pingCounter - 1].end = Time.nowNs()
            const pingClient = this.getClientPing()
            this.serverPings.push(pingClient)
            this.ctx.threadResult.pings.push({
                value_server: pingClient,
                value: pingClient,
                time_ns: this.getDuration(),
            })
            this.stopMessaging()
            return
        }
        if (data.includes(ESocketMessage.PONG)) {
            Logger.I.info(
                `Thread ${this.ctx.index} received a PONG. Continuing.`
            )
            this.ctx.client.write(ESocketMessage.OK, () => {
                this.pingTimes[this.pingCounter - 1].end = Time.nowNs()
            })
            return
        }
        if (data.includes(ESocketMessage.TIME)) {
            const timeMatches = data.toString().split(" ")
            const pingServer = timeMatches?.[1] ? Number(timeMatches[1]) : -1
            const pingClient = this.getClientPing()
            if (pingServer) {
                this.serverPings.push(pingServer)
                this.ctx.threadResult.pings.push({
                    value: pingClient,
                    value_server: pingServer,
                    time_ns: this.getDuration(),
                })
            }
        }
        if (data.includes(ESocketMessage.ACCEPT_GETCHUNKS)) {
            if (
                this.getDuration() < 1_000_000_000 ||
                this.pingCounter < (this.ctx.params.test_numpings ?? 1)
            ) {
                this.writeData()
            } else {
                this.stopMessaging()
            }
            return
        }
    }

    private getClientPing() {
        return (
            this.pingTimes[this.pingCounter - 1].end -
            this.pingTimes[this.pingCounter - 1].start
        )
    }

    private getDuration() {
        return Time.nowNs() - this.pingStartTime
    }
}
