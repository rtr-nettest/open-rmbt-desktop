import { hrtime } from "process"
import { ESocketMessage } from "../../enums/socket-message.enum"
import { IMeasurementThreadResult } from "../../interfaces/measurement-result.interface"
import {
    IMessageHandler,
    IMessageHandlerContext,
} from "../../interfaces/message-handler.interface"
import { Logger } from "../logger.service"
import { Time } from "../time.service"
import { ELoggerMessage } from "../../enums/logger-message.enum"

export class PingMessageHandler implements IMessageHandler {
    private _serverPings: number[] = []
    private _pingStartTime = Time.nowNs()
    private _pingTimes: { start: bigint; end: bigint }[] = []
    private _pingCounter = 0
    private _maxPingCounter = 200

    get serverPings() {
        return this._serverPings
    }

    get pingStartTime() {
        return this._pingStartTime
    }

    get pingTimes() {
        return this._pingTimes
    }

    get pingCounter() {
        return this._pingCounter
    }

    constructor(
        private ctx: IMessageHandlerContext,
        public onFinish: (result: IMeasurementThreadResult) => void
    ) {}

    stopMessaging(): void {
        this._serverPings.sort()
        const middle = this._serverPings.length / 2
        if (this._serverPings.length % 2 === 0) {
            const medianA = this._serverPings[middle]
            const medianB = this._serverPings[middle - 1]
            this.ctx.threadResult!.ping_median = (medianA + medianB) / 2
        } else {
            this.ctx.threadResult!.ping_median =
                this._serverPings[Math.floor(middle)]
        }
        this.onFinish?.(this.ctx.threadResult!)
    }

    writeData() {
        this.ctx.client.write(ESocketMessage.PING, this.writeCallback)
    }

    writeCallback = () => {
        if (this._pingCounter === 0) {
            this._pingStartTime = Time.nowNs()
        }
        this._pingTimes.push({
            start: hrtime.bigint(),
            end: 0n,
        })
        Logger.I.info(
            ELoggerMessage.T_SENDING_MESSAGE,
            this.ctx.index,
            ESocketMessage.PING.replace("\n", " #" + (this._pingCounter + 1))
        )
        this._pingCounter += 1
    }

    okCallback = () => {
        this._pingTimes[this._pingCounter - 1].end = hrtime.bigint()
    }

    readData(data: Buffer) {
        if (data.includes(ESocketMessage.ERR)) {
            Logger.I.info(ELoggerMessage.T_PING_ERROR, this.ctx.index)
            this._pingTimes[this._pingCounter - 1].end = hrtime.bigint()
            const pingClient = this.getClientPing()
            this._serverPings.push(pingClient)
            this.ctx.threadResult!.pings.push({
                value_server: pingClient,
                value: pingClient,
                time_ns: this.getDuration(),
            })
            this.stopMessaging()
            return
        }
        if (data.includes(ESocketMessage.PONG)) {
            Logger.I.info(ELoggerMessage.T_PING_PONG, this.ctx.index)
            this.ctx.client.write(ESocketMessage.OK, this.okCallback)
            return
        }
        if (data.indexOf(ESocketMessage.TIME) === 0) {
            const timeMatches = data.toString().split(" ")
            const pingServer = timeMatches?.[1] ? Number(timeMatches[1]) : -1
            const pingClient = this.getClientPing()
            if (pingServer) {
                this._serverPings.push(pingServer)
                this.ctx.threadResult!.pings.push({
                    value: pingClient,
                    value_server: pingServer,
                    time_ns: this.getDuration(),
                })
            }
        }
        if (data.includes(ESocketMessage.ACCEPT_GETCHUNKS)) {
            if (
                this._pingCounter < (this.ctx.params.test_numpings ?? 1) ||
                (this.getDuration() < 1e9 &&
                    this._pingCounter < this._maxPingCounter)
            ) {
                this.writeData()
            } else {
                this.stopMessaging()
            }
            return
        }
    }

    private getClientPing() {
        return Number(
            this._pingTimes[this._pingCounter - 1].end -
                this._pingTimes[this._pingCounter - 1].start
        )
    }

    private getDuration() {
        return Time.nowNs() - this._pingStartTime
    }
}
