import { Socket } from "net"
import { MeasurementResult } from "../dto/measurement-result.dto"
import { ESocketMessage } from "../enums/socket-message.enum"
import { IMeasurementRegistrationResponse } from "../interfaces/measurement-registration-response.interface"
import { IMeasurementResult } from "../interfaces/measurement-result.interface"

export class RMBTThreadService {
    private client: Socket = new Socket()
    currentTransfer: number = -1
    currentTime: number = -1
    index: number
    isConnected = false
    params: IMeasurementRegistrationResponse
    result?: IMeasurementResult;
    in = 0
    out = 0
    totalDown = 0
    totalUp = 0
    buf?: Buffer
    private onInit?: (isInitialized: boolean) => void

    constructor(params: IMeasurementRegistrationResponse, index: number) {
        this.params = params
        this.index = index

        this.client.on("data", this.dataListener.bind(this))
        this.client.on("error", this.errorListener.bind(this))
        this.client.on("end", this.endListener.bind(this))
        this.client.on("close", this.closeListener.bind(this))
    }

    async connect() {
        this.result = new MeasurementResult()
        console.log(
            `Thread ${this.index} is connecting on host ${this.params.test_server_address}, port ${this.params.test_server_port}...`
        )
        this.isConnected = await new Promise((resolve) => {
            this.client.connect(
                this.params.test_server_port,
                this.params.test_server_address,
                () => resolve(true)
            )
        })
        console.log(`Thread ${this.index} is connected.`)
        this.result.ip_local = this.client.localAddress
        this.result.ip_server = this.client.remoteAddress
        this.result.port_remote = this.client.remotePort
        if (this.in) {
            this.totalDown += this.in
        }
        if (this.out) {
            this.totalUp += this.out
        }
        this.in = 0
        this.out = 0
        // TODO: this is pulled from the Android app for RMBTHttp, and should handle measurements on ports 80 and 443, but is not working
        // if (this.params.test_server_type === "RMBThttp") {
        //     console.log(`Thread ${this.index} is requesting HTTP upgrade...`)
        //     this.client.write(Buffer.from(ESocketMessage.HTTP_UPGRADE, "ascii"))
        // }
        return this
    }

    dataListener(data: Buffer) {
        const dataString = data.toString().trim()
        console.log(`Thread ${this.index} received data:`, dataString)
        switch (true) {
            case dataString.includes(ESocketMessage.GREETING):
                const versionMatches = new RegExp(/RMBTv([0-9.]+)/).exec(
                    dataString
                )
                if (this.result && versionMatches?.[1])
                    this.result.client_version = versionMatches[1]
                break
            case dataString.includes(ESocketMessage.ACCEPT_TOKEN):
                console.log(
                    `Thread ${this.index} sends token:`,
                    this.params.test_token
                )
                this.client.write(
                    `${ESocketMessage.TOKEN} ${this.params.test_token}`,
                    "ascii"
                )
                break
            case dataString.includes(ESocketMessage.CHUNKSIZE):
                const chunksize = Number(dataString.split(" ")[1])
                if (
                    this.buf === null ||
                    (this.buf != null && this.buf?.length != chunksize)
                ) {
                    this.buf = Buffer.alloc(chunksize)
                    console.log(
                        `Setting chunksize ${chunksize} for the thread ${this.index}.`
                    )
                }
                this.onInit?.(true)
                break
            default:
                break
        }
    }

    errorListener(err: Error) {
        console.error(`Thread ${this.index} reported an error:`, err.message)
    }

    endListener() {
        console.log(`Transmission was ended on the thread ${this.index}.`)
    }

    closeListener(hadError: boolean) {
        console.log(
            `Connection was closed for the thread ${this.index}`,
            hadError ? "with error." : "."
        )
    }

    async waitForInit() {
        return new Promise((resolve) => {
            this.onInit = resolve
        })
    }
}
