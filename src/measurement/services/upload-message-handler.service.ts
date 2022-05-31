import { Socket } from "net"
import { IMeasurementRegistrationResponse } from "../interfaces/measurement-registration-response.interface"
import { IMeasurementThreadResult } from "../interfaces/measurement-result.interface"
import { IMessageHandler } from "../interfaces/message-handler.interface"

export class UploadMessageHandler implements IMessageHandler {
    constructor(
        private client: Socket,
        private index: number,
        private chunksize: number,
        private params: IMeasurementRegistrationResponse,
        private threadResult: IMeasurementThreadResult,
        private setIntermidiateResults: (
            currentTransfer: number,
            currentTime: bigint
        ) => void,
        public onFinish: (result: IMeasurementThreadResult) => void
    ) {}

    writeData(): void {
        throw new Error("Method not implemented.")
    }
    readData(data: Buffer): void {
        throw new Error("Method not implemented.")
    }
}
