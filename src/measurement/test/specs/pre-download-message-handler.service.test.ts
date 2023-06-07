import { Time } from "../../services/time.service"
import { ESocketMessage } from "../../enums/socket-message.enum"
import mockFactory from "../utils/rmbt-thread-mock.factory"
import { randomBytes } from "crypto"
import { PreDownloadMessageHandler } from "../../services/message-handlers/pre-download-message-handler.service"

const { mockThread, mockClient } = mockFactory()

let handler: PreDownloadMessageHandler = new PreDownloadMessageHandler(
    mockThread,
    () => void 0
)

beforeEach(() => {
    handler = new PreDownloadMessageHandler(mockThread, () => void 0)
})

test("Handler is initialized", () => {
    expect(typeof handler.stopMessaging).toBe("function")
    expect(typeof handler.readData).toBe("function")
    expect(typeof handler.writeData).toBe("function")
    expect(Object.keys(handler.chunkMessages).length).toBe(23)
})

test("Handler writes data", () => {
    const mockedTime = Time.nowNs()
    Time.mockTime(mockedTime)

    handler.writeData()

    expect(handler.preDownloadBytesRead).toBe(0)
    expect(handler.preDownloadEndTime).toBe(
        mockedTime + handler.preDownloadDuration
    )
    expect(mockThread.preDownloadChunks).toBe(1)
    expect(mockClient.write).toHaveBeenCalledWith(handler.chunkMessages[1])
    expect(handler.isChunkPortionFinished).toBe(false)

    Time.mockRestore()
})

test("Stops messaging", () => {
    const finishSpy = jest.spyOn(handler, "onFinish")

    handler.stopMessaging()

    expect(finishSpy).toHaveBeenCalled()
})

test("Handler reads data and continues measurement", () => {
    const mockedTime = Time.nowNs()
    Time.mockTime(mockedTime)

    handler.writeData()
    handler.readData(Buffer.from(ESocketMessage.ACCEPT_GETCHUNKS))

    expect(mockThread.preDownloadChunks).toBe(2)
    expect(mockClient.write).toHaveBeenCalledWith(handler.chunkMessages[2])
    expect(handler.isChunkPortionFinished).toBe(false)

    Time.mockRestore()
})

test("Handler reads data and stops measurement", () => {
    const mockedTime = Time.nowNs()
    const stopSpy = jest.spyOn(handler, "stopMessaging")
    Time.mockTime(mockedTime + handler.preDownloadDuration)

    handler.readData(Buffer.from(ESocketMessage.ACCEPT_GETCHUNKS))

    expect(stopSpy).toHaveBeenCalled()

    Time.mockRestore()
})

test("Handler reads data and caclulates bytesPerSecPretest", async () => {
    const chunk = randomBytes(mockThread.chunkSize)
    chunk[chunk.length - 1] = 0xff

    for (let i = 1; i < 4; i++) {
        handler.readData(chunk)

        expect(handler.preDownloadBytesRead).toBe(mockThread.chunkSize * i)
        expect(mockClient.write).toHaveBeenCalledWith(ESocketMessage.OK)
        expect(handler.isChunkPortionFinished).toBe(true)

        const mockedTime = Time.nowNs() + 1e9
        Time.mockTime(mockedTime)

        handler.readData(Buffer.from(`${ESocketMessage.TIME} ${mockedTime}`))

        expect(
            mockThread.bytesPerSecPretest[
                mockThread.bytesPerSecPretest.length - 1
            ]
        ).toBe(handler.preDownloadBytesRead / (mockedTime / 1e9))
    }

    Time.mockRestore()
})
