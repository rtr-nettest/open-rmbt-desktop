import { ESocketMessage } from "../../enums/socket-message.enum"
import mockFactory from "../utils/rmbt-thread-mock.factory"
import { PingMessageHandler } from "../../services/message-handlers/ping-message-handler.service"
import { Time } from "../../services/time.service"

const { mockThread, mockClient } = mockFactory()

let handler: PingMessageHandler = new PingMessageHandler(
    mockThread,
    () => void 0
)

beforeEach(() => {
    handler = new PingMessageHandler(mockThread, () => void 0)
})

test("Handler is initialized", () => {
    expect(typeof handler.stopMessaging).toBe("function")
    expect(typeof handler.readData).toBe("function")
    expect(typeof handler.writeData).toBe("function")
})

test("Handler writes data", () => {
    handler.writeData()

    expect(mockClient.write).toBeCalledWith(
        ESocketMessage.PING,
        handler.writeCallback
    )

    const mockedTime = Time.nowNs()
    Time.mockTime(mockedTime)

    handler.writeCallback()

    expect(handler.pingStartTime).toBe(mockedTime)
    expect(handler.pingTimes.length).toBe(1)
    expect(handler.pingTimes[0].start).toBeGreaterThan(0n)
    expect(handler.pingCounter).toBe(1)

    Time.mockRestore()
})

test("Handler reads error", () => {
    const mockedTime = Time.nowNs()
    Time.mockTime(mockedTime)

    handler.writeCallback()
    handler.readData(Buffer.from(ESocketMessage.ERR))

    const ping = Number(handler.pingTimes[0].end - handler.pingTimes[0].start)
    expect(ping).toBeGreaterThan(0)
    expect(handler.serverPings.length).toBe(1)
    expect(Number(handler.serverPings[0])).toBe(ping)
    expect(mockThread.threadResult?.pings.length).toBe(1)
    expect(mockThread.threadResult?.pings[0].value).toBe(ping)
    expect(mockThread.threadResult?.pings[0].value_server).toBe(ping)
    expect(mockThread.threadResult?.pings[0].time_ns).toBe(0)
})

test("Handler reads pong", () => {
    handler.writeCallback()
    handler.readData(Buffer.from(ESocketMessage.PONG))

    expect(mockClient.write).toBeCalledWith(
        ESocketMessage.OK,
        handler.okCallback
    )

    handler.okCallback()

    const ping = handler.pingTimes[handler.pingCounter - 1]
    expect(Number(ping.end)).toBeGreaterThan(ping.start)
})

test("Handler reads time", () => {
    const mockedTime = Time.nowNs()
    Time.mockTime(mockedTime)
    const ping = 12345

    handler.writeCallback()
    handler.okCallback()

    handler.readData(Buffer.from(`${ESocketMessage.TIME} ${ping}`))

    expect(handler.serverPings[0]).toBe(ping)
    expect(mockThread.threadResult?.pings.length).toBe(2)
    expect(mockThread.threadResult?.pings[1].value_server).toBe(ping)
    expect(mockThread.threadResult?.pings[1].value).toBeGreaterThan(0)
    expect(mockThread.threadResult?.pings[1].time_ns).toBe(0)
})

test("Handler stops reading", () => {
    const mockedTime = Time.nowNs()
    Time.mockTime(mockedTime)
    const writeSpy = jest.spyOn(handler, "writeData")
    const stopSpy = jest.spyOn(handler, "stopMessaging")
    const msg = Buffer.from(ESocketMessage.ACCEPT_GETCHUNKS)

    handler.readData(msg)

    expect(writeSpy).toBeCalled()

    handler.writeCallback()
    handler.readData(msg)

    expect(writeSpy).toBeCalled()

    Time.mockTime(mockedTime + 1e9)
    handler.readData(msg)

    expect(stopSpy).toBeCalled()
})
