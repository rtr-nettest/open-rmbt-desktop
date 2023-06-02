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
import { randomBytes } from "crypto"
import { RMBTClient } from "../../services/rmbt-client.service"

const handler: DownloadMessageHandler = new DownloadMessageHandler(
    mockThread,
    () => void 0
)
let globalSpy: jest.SpyInstance

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
    jest.useFakeTimers()
    globalSpy = jest.spyOn(global, "setInterval")
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

test("Handler reads data", async () => {
    jest.useRealTimers()
    globalSpy.mockRestore()
    const endTimeS = Number(mockResponse.test_duration)
    const chunks: Buffer[] = []
    for (let i = 0; i < endTimeS; i++) {
        const chunk = randomBytes(mockThread.chunkSize)
        if (i < endTimeS - 1) {
            chunk[chunk.length - 1] = 0x00
        } else {
            chunk[chunk.length - 1] = 0xff
        }
        chunks.push(chunk)
    }

    for (let i = 0; i < endTimeS; i++) {
        await new Promise((resolve) => {
            setTimeout(() => {
                console.log(i)
                handler.readData(chunks[i])
                resolve(void 0)
            }, 1000)
        })
    }
    const speedMbps = Math.round(
        RMBTClient.getFineResult(
            [{ ...mockThread.threadResult!, down: handler.result }],
            "down"
        ).speed / 1e6
    )

    expect(handler.downloadBytesRead).toBe(29360128)
    expect(handler.nsec).toBe(Infinity)
    expect(speedMbps).toBe(33)
}, 10000)
