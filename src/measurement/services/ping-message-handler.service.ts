import { Socket } from "net"
import { hrtime } from "process"
import { ESocketMessage } from "../enums/socket-message.enum"
import { IMeasurementRegistrationResponse } from "../interfaces/measurement-registration-response.interface"
import {
    IMeasurementResult,
    IPing,
} from "../interfaces/measurement-result.interface"
import { IMessageHandler } from "../interfaces/message-handler.interface"
import { Logger } from "./logger.service"

export class PingMessageHandler implements IMessageHandler {
    private serverPings: bigint[] = []
    private pingCurrentStartTime = hrtime.bigint()
    private pingCurrentEndTime = hrtime.bigint()
    private pingCounter = 0

    constructor(
        public onFinish: (medianPing: bigint) => void,
        private client: Socket,
        private index: number,
        private params: IMeasurementRegistrationResponse,
        private result: IMeasurementResult
    ) {}

    writeData() {
        this.pingCurrentStartTime = hrtime.bigint()
        this.client.write(Buffer.from(ESocketMessage.PING, "ascii"))
        Logger.I.info(
            `Thread ${this.index} sent ${ESocketMessage.PING.replace(
                "\n",
                ""
            )} #${this.pingCounter + 1}`
        )
        this.pingCounter += 1
    }

    readData(data: Buffer) {
        if (data.includes(ESocketMessage.PONG)) {
            this.pingCurrentEndTime = hrtime.bigint()
            Logger.I.info(
                `Thread ${this.index} is ${ESocketMessage.OK}Continuing.`
            )
            this.client.write(ESocketMessage.OK)
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

            if (ping.client < (this.result.ping_shortest || Infinity)) {
                this.result.ping_shortest = ping.client
            }
            this.serverPings.push(ping.server)
        }
        if (data.includes(ESocketMessage.ACCEPT_GETCHUNKS)) {
            if (this.pingCounter < (this.params.test_numpings ?? 0)) {
                this.writeData()
            } else {
                this.serverPings.sort()
                const middle = this.serverPings.length / 2
                if (this.serverPings.length % 2 === 0) {
                    const medianA = this.serverPings[middle]
                    const medianB = this.serverPings[middle - 1]
                    this.result.ping_median = (medianA + medianB) / 2n
                } else {
                    this.result.ping_median =
                        this.serverPings[Math.floor(middle)]
                }
                this.onFinish?.(this.result.ping_median)
            }
            return
        }
    }
}
