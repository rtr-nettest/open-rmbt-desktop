import { Time } from "../../services/time.service"
import { ESocketMessage } from "../../enums/socket-message.enum"
import mockFactory from "../utils/rmbt-thread-mock.factory"
import { randomBytes } from "crypto"
import { PreUploadMessageHandler } from "../../services/message-handlers/pre-upload-message-handler.service"

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
