import { Socket } from "net"
import { IMeasurementRegistrationResponse } from "../interfaces/measurement-registration-response.interface"

export class RMBTTestService {
    private client: Socket = new Socket()
    currentTransfer: number = -1
    currentTime: number = -1
    index: number
    isConnected = false
    params: IMeasurementRegistrationResponse

    constructor(params: IMeasurementRegistrationResponse, index: number) {
        this.params = params
        this.index = index
    }

    async connect() {
        this.isConnected = await new Promise((resolve) => {
            this.client.connect(
                this.params.test_server_port,
                this.params.test_server_address,
                () => resolve(true)
            )
        })
        console.log(`Thread ${this.index} is connected`)
        return this
    }
}
