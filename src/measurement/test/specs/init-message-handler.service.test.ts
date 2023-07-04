import { ESocketMessage } from "../../enums/socket-message.enum"
import mockFactory from "../utils/rmbt-thread-mock.factory"
import { InitMessageHandler } from "../../services/message-handlers/init-message-handler.service"
import { EMeasurementServerType } from "../../enums/measurement-server-type.enum"

const { mockThread, mockClient } = mockFactory()

let handler: InitMessageHandler = new InitMessageHandler(
    mockThread,
    () => void 0
)

beforeEach(() => {
    handler = new InitMessageHandler(mockThread, () => void 0)
})

test("Handler is initialized", () => {
    expect(typeof handler.stopMessaging).toBe("function")
    expect(typeof handler.readData).toBe("function")
    expect(typeof handler.writeData).toBe("function")
})

test("Handler stops messaging", () => {
    const finishMock = jest.spyOn(handler, "onFinish")

    handler.stopMessaging()

    expect(finishMock).toBeCalledWith(false)

    handler.readData(Buffer.from(ESocketMessage.ACCEPT_GETCHUNKS))

    expect(handler.isInitialized).toBe(true)
    expect(finishMock).toBeCalledWith(false)

    handler.stopMessaging()

    expect(finishMock).toBeCalledWith(false)
})

test("Handler writes data", () => {
    handler.writeData()

    expect(mockClient.write).not.toHaveBeenCalled()

    mockThread.params.test_server_type = EMeasurementServerType.RMBThttp

    handler.writeData()

    expect(mockClient.write).toBeCalledWith(
        ESocketMessage.HTTP_UPGRADE,
        "ascii"
    )
})

test("Handler reads client version", () => {
    const num = 12345
    handler.readData(Buffer.from(`${ESocketMessage.GREETING}v${num}`))

    expect(mockThread.threadResult?.client_version).toBe(num.toString())
})

test("Handler reads token", () => {
    handler.readData(Buffer.from(ESocketMessage.ACCEPT_TOKEN))

    expect(mockClient.write).toBeCalledWith(
        `${ESocketMessage.TOKEN} ${mockThread.params.test_token}\n`,
        "ascii"
    )
})

test("Handler reads chunk size", () => {
    const chunkSize = 1000
    handler.readData(Buffer.from(`${ESocketMessage.CHUNKSIZE} ${chunkSize}`))

    expect(mockThread.chunkSize).toBe(chunkSize)
    expect(mockThread.defaultChunkSize).toBe(chunkSize)
})
