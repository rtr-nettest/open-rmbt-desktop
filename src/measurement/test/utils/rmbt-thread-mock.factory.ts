import * as ThreadService from "../../services/rmbt-thread.service"
import { IMeasurementRegistrationResponse } from "../../interfaces/measurement-registration-response.interface"
import { Socket } from "net"
import { RMBTClient } from "../../services/rmbt-client.service"
import { MeasurementThreadResult } from "../../dto/measurement-thread-result.dto"
import { Logger } from "../../services/logger.service"

jest.mock("../../services/rmbt-thread.service")
jest.mock("net")
Logger.mock()

export default function main() {
    const mockResponse: IMeasurementRegistrationResponse = {
        client_remote_ip: "",
        test_server_encryption: false,
        test_numthreads: 0,
        test_uuid: "",
        test_token: "test_token",
        test_server_address: "",
        test_duration: "7",
        result_url: "",
        test_wait: 0,
        test_server_port: 0,
    }
    const mockClient = new Socket()
    const mockThread = new ThreadService.RMBTThread(mockResponse, 0)
    mockThread.index = 0
    mockThread.params = mockResponse
    mockThread.client = mockClient
    mockThread.chunkSize = RMBTClient.maxChunkSize
    mockThread.threadResult = new MeasurementThreadResult(mockThread.index)
    mockThread.interimHandler = jest.fn()
    mockThread.bytesPerSecPretest = []

    return { mockResponse, mockClient, mockThread }
}
