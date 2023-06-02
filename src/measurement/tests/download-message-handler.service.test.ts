import { IMeasurementRegistrationResponse } from "../interfaces/measurement-registration-response.interface"
import { DownloadMessageHandler } from "../services/message-handlers/download-message-handler.service"
import * as ThreadService from "../services/rmbt-thread.service"

jest.mock("../services/rmbt-thread.service")

const mockResponse: IMeasurementRegistrationResponse = {
    client_remote_ip: "",
    test_server_encryption: false,
    test_numthreads: 0,
    test_uuid: "",
    test_token: "",
    test_server_address: "",
    test_duration: "7",
    result_url: "",
    test_wait: 0,
    test_server_port: 0,
}
const mockThread = new ThreadService.RMBTThread(mockResponse, 0)
mockThread.params = mockResponse
const handler: DownloadMessageHandler = new DownloadMessageHandler(
    mockThread,
    () => void 0
)

test("Handler is initialized", () => {
    expect(typeof handler.stopMessaging).toBe("function")
    expect(typeof handler.readData).toBe("function")
    expect(typeof handler.writeData).toBe("function")
})
