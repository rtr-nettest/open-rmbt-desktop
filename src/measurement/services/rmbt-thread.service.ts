import { Socket } from "net"
import { IMeasurementRegistrationResponse } from "../interfaces/measurement-registration-response.interface"

const EXPECTED_GREETING = "RMBT"

export class RMBTThreadService {
    private client: Socket = new Socket()
    currentTransfer: number = -1
    currentTime: number = -1
    index: number
    isConnected = false
    params: IMeasurementRegistrationResponse

    constructor(params: IMeasurementRegistrationResponse, index: number) {
        this.params = params
        this.index = index

        this.client.on("data", this.dataListener.bind(this))
        this.client.on("error", this.errorListener.bind(this))
        this.client.on("end", this.endListener.bind(this))
        this.client.on("close", this.closeListener.bind(this))
    }

    async connect() {
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
        // TODO: this is pulled from the Android app for RMBTHttp, and should handle measurements on ports 80 and 443, but is not working
        // if (this.params.test_server_type === "RMBThttp") {
        //     console.log(`Thread ${this.index} is requesting HTTP upgrade...`)
        //     this.client.write(Buffer.from(ESocketMessage.HTTP_UPGRADE, "ascii"))
        // }
        return this
    }

    dataListener(data: Buffer) {
        const dataString = data.toString()
        console.log(`Thread ${this.index} received data:`, dataString)
        if (dataString.includes(EXPECTED_GREETING)) {
            // TODO: handle in JS
            // line = line.trim();
            // Matcher matcher = RMBT_SERVER_PATTERN.matcher(line.trim());
            // String version;
            // if (matcher.find()) {
            //     version = matcher.group(1);
            //     testResult.client_version = version;
            // }
        }
    }

    errorListener(err: Error) {
        console.error(`Thread ${this.index} reported an error:`, err.message)
    }

    endListener() {
        console.log(`Transmission was finished on the thread ${this.index}.`)
    }

    closeListener(hadError: boolean) {
        console.log(
            `Connection was closed for the thread ${this.index}`,
            hadError ? "with error." : "."
        )
    }
}
