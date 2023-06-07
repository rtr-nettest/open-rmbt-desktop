import { Time } from "../../services/time.service"
import { ESocketMessage } from "../../enums/socket-message.enum"
import mockFactory from "../utils/rmbt-thread-mock.factory"
import { PreUploadMessageHandler } from "../../services/message-handlers/pre-upload-message-handler.service"
import { RMBTClient } from "../../services/rmbt-client.service"

const { mockThread, mockClient } = mockFactory()

let handler: PreUploadMessageHandler = new PreUploadMessageHandler(
    mockThread,
    () => void 0
)

beforeEach(() => {
    handler = new PreUploadMessageHandler(mockThread, () => void 0)
})

test("Handler is initialized", () => {
    expect(typeof handler.stopMessaging).toBe("function")
    expect(typeof handler.readData).toBe("function")
    expect(typeof handler.writeData).toBe("function")
    expect(Object.keys(handler.buffersMap).length).toBe(11)
})

test("Handler writes data", () => {
    handler.writeData()
})

test("Handler stops reading data", () => {
    const mockedTime = Time.nowNs()
    Time.mockTime(mockedTime)
    handler.writeData()
    Time.mockTime(mockedTime + 2e9)
    const finishSpy = jest.spyOn(handler, "onFinish")

    handler.readData(Buffer.from(ESocketMessage.ACCEPT_GETCHUNKS))

    expect(finishSpy).toBeCalledWith(handler.chunkSize)

    Time.mockRestore()
})

test("Handler reads data and increases chunks count", () => {
    handler.writeData()

    expect(mockThread.preUploadChunks).toBe(1)
    expect(handler.minChunkSize).toBe(handler.chunkSize)
    expect(mockClient.write).toBeCalledWith(
        `${ESocketMessage.PUTNORESULT} ${handler.chunkSize}\n`
    )
    expect(mockClient.write).toBeCalledWith(
        handler.buffersMap[handler.chunkSize][0]
    )

    for (let i = 1; i < 3; i++) {
        handler.readData(Buffer.from(ESocketMessage.ACCEPT_GETCHUNKS))

        expect(mockThread.preUploadChunks).toBe(i * 2)
        expect(handler.minChunkSize).toBe(handler.chunkSize * i * 2)
        expect(mockClient.write).toBeCalledWith(
            `${ESocketMessage.PUTNORESULT} ${handler.chunkSize * i * 2}\n`
        )
        expect(mockClient.write).toBeCalledWith(
            handler.buffersMap[handler.chunkSize][i]
        )
    }

    handler.readData(Buffer.from(ESocketMessage.ACCEPT_GETCHUNKS))

    expect(mockThread.preUploadChunks).toBe(8)
    expect(handler.minChunkSize).toBe(handler.chunkSize * 8)
    expect(mockClient.write).toBeCalledWith(
        `${ESocketMessage.PUTNORESULT} ${handler.chunkSize * 8}\n`
    )
    expect(mockClient.write).toBeCalledWith(
        handler.buffersMap[handler.chunkSize][0]
    )
})

test("Handler reads data and increases chunk size", () => {
    mockThread.preUploadChunks = 16

    handler.readData(Buffer.from(ESocketMessage.ACCEPT_GETCHUNKS))

    expect(mockThread.preUploadChunks).toBe(1)
    expect(handler.chunkSize).toBe(RMBTClient.minChunkSize * 2)
    expect(mockClient.write).toBeCalledWith(
        `${ESocketMessage.PUTNORESULT} ${handler.chunkSize}\n`
    )
    expect(mockClient.write).toBeCalledWith(
        handler.buffersMap[handler.chunkSize][0]
    )
})
