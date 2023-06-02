import { Time } from "../../services/time.service"
import { ELoggerMessage } from "../../enums/logger-message.enum"
import { ESocketMessage } from "../../enums/socket-message.enum"
import { Logger } from "../../services/logger.service"
import { DownloadMessageHandler } from "../../services/message-handlers/download-message-handler.service"
import {
    mockResponse,
    mockClient,
    mockThread,
} from "../utils/rmbt-thread-mock.factory"

const handler: DownloadMessageHandler = new DownloadMessageHandler(
    mockThread,
    () => void 0
)

test("Handler is initialized", () => {
    expect(typeof handler.stopMessaging).toBe("function")
    expect(typeof handler.readData).toBe("function")
    expect(typeof handler.writeData).toBe("function")
    const expectedLength =
        (Number(mockResponse.test_duration) * 1e9) /
        DownloadMessageHandler.minDiffTime
    console.log("Expected results length is", expectedLength)
    expect(handler.result.maxStoredResults).toBe(expectedLength)
})

test("Handler writes data", () => {
    const infoSpy = jest.spyOn(Logger.I, "info")
    const msg = `${ESocketMessage.GETTIME} ${mockResponse.test_duration}${
        mockThread.chunkSize === mockThread.defaultChunkSize
            ? "\n"
            : ` ${mockThread.chunkSize}\n`
    }`
    const startTime = Time.nowNs()
    const endTime = Time.nowNs() + Number(mockResponse.test_duration) * 1e9

    handler.writeData()

    expect(handler.downloadStartTime).toBe(startTime)
    expect(handler.downloadEndTime).toBe(endTime)
    expect(setInterval).toHaveBeenCalledTimes(2)
    expect(infoSpy).toHaveBeenCalledWith(
        ELoggerMessage.T_SENDING_MESSAGE,
        mockThread.index,
        msg
    )
    expect(mockClient.write).toHaveBeenCalledTimes(1)
    expect(mockClient.write).toHaveBeenCalledWith(msg)
})
