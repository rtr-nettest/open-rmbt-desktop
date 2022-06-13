import { randomBytes } from "crypto"
import { parentPort, workerData } from "worker_threads"
import {
    IncomingMessageWithData,
    OutgoingMessageWithData,
} from "../interfaces/rmbt-worker.interface"

let interval: NodeJS.Timer

parentPort?.on("message", (message: IncomingMessageWithData) => {
    switch (message.message) {
        case "startRandomGenerator":
            parentPort?.postMessage(
                new OutgoingMessageWithData("bufferGenerated", {
                    buffer: randomBytes(Number(workerData.chunkSize)),
                    index: workerData.index,
                })
            )
            interval = setInterval(() => {
                randomBytes(Number(workerData.chunkSize), (_, buffer) => {
                    parentPort?.postMessage(
                        new OutgoingMessageWithData("bufferGenerated", {
                            buffer,
                            index: workerData.index,
                        })
                    )
                })
            }, 0)
            break
    }
})
