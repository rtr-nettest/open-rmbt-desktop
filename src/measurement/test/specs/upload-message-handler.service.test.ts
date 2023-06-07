import { Time } from "../../services/time.service"
import { ELoggerMessage } from "../../enums/logger-message.enum"
import { ESocketMessage } from "../../enums/socket-message.enum"
import { Logger } from "../../services/logger.service"
import mockFactory from "../utils/rmbt-thread-mock.factory"
import { randomBytes } from "crypto"
import { RMBTClient } from "../../services/rmbt-client.service"
import fs from "fs"
import fsp from "fs/promises"
import * as st from "stream-throttle"
import { UploadMessageHandler } from "../../services/message-handlers/upload-message-handler.service"
import { DownloadMessageHandler } from "../../services/message-handlers/download-message-handler.service"

const { mockThread, mockClient, mockResponse } = mockFactory()

let handler: UploadMessageHandler = new UploadMessageHandler(
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
    expect(handler.result.maxStoredResults).toBe(expectedLength)
    expect(handler.buffers.length).toBe(3)
})

test("Handler writes data", () => {
    jest.useFakeTimers()
    const setIntervalSpy = jest.spyOn(global, "setInterval")
    const clearIntervalSpy = jest.spyOn(global, "clearInterval")
    const mockedTime = Time.nowNs()
    Time.mockTime(mockedTime)

    handler.writeData()

    expect(clearIntervalSpy).toBeCalledTimes(1)
    expect(setIntervalSpy).toBeCalledTimes(2)
    expect(handler.uploadEndTimeNs).toBe(mockedTime + 7e9)
    expect(mockClient.write).toBeCalledWith(
        `${ESocketMessage.PUT} ${mockThread.chunkSize}\n`
    )
    expect(mockClient.on).toBeCalled()

    Time.mockRestore()
    clearIntervalSpy.mockRestore()
    setIntervalSpy.mockRestore()
})

test("Handler submits interim results", () => {
    const interimSpy = jest.spyOn(mockThread, "interimHandler")

    handler.interimCheck()

    expect(interimSpy).toBeCalled()
})

test("Handler stops messaging", () => {
    jest.useFakeTimers()
    const clearIntervalSpy = jest.spyOn(global, "clearInterval")
    const finishSpy = jest.spyOn(handler, "onFinish")

    handler.readData(Buffer.from(ESocketMessage.ACCEPT_GETCHUNKS))

    expect(mockClient.off).toBeCalled()
    expect(clearIntervalSpy).toBeCalledTimes(2)
    expect(mockThread.threadResult?.up).toBe(handler.result)
    expect(finishSpy).toBeCalledWith(mockThread.threadResult)

    clearIntervalSpy.mockRestore()
})

test("Handler puts chunks", () => {
    jest.useFakeTimers()
    const mockedTime = Time.nowNs()
    Time.mockTime(mockedTime)
    const endTime = mockedTime + 7e9
    let writtenBuffer = handler.buffers[0]
    writtenBuffer[writtenBuffer.length - 1] = 0x00
    jest.spyOn(handler, "waterMark", "get").mockReturnValue(0)
    const globalSpy = jest.spyOn(global, "setTimeout")

    handler.readData(Buffer.from(ESocketMessage.OK))

    expect(handler.uploadEndTimeNs).toBe(endTime)
    expect(mockClient.write).toBeCalledWith(writtenBuffer)
    expect(handler.bytesWritten).toBe(0)

    mockThread.params.test_duration = 0
    writtenBuffer = handler.buffers[0]
    writtenBuffer[writtenBuffer.length - 1] = 0xff

    handler.readData(Buffer.from(ESocketMessage.OK))
    expect(mockClient.write).toBeCalledWith(writtenBuffer)
    expect(globalSpy).toBeCalled()

    globalSpy.mockRestore()
})
