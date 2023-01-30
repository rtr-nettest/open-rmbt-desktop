import {
    IMeasurementThreadResultList,
    ISpeedItem,
} from "../interfaces/measurement-result.interface"
import { Logger } from "../services/logger.service"
import { DownloadMessageHandler } from "../services/message-handlers/download-message-handler.service"

export class MeasurementThreadResultList
    implements IMeasurementThreadResultList
{
    bytes: number[] = []
    nsec: number[] = []
    private resultsCounter = 0

    constructor(private maxStoredResults: number) {}

    addResult(newBytes: number, newNsec: number) {
        Logger.I.info("New bytes: %d. New nsec: %d.", newBytes, newNsec)
        let nsecDiff = newNsec
        if (this.resultsCounter > 0) {
            const prevNsec = this.nsec[this.resultsCounter - 1]
            nsecDiff = newNsec - prevNsec
        }
        if (
            this.resultsCounter < this.maxStoredResults &&
            (nsecDiff >= DownloadMessageHandler.minDiffTime ||
                this.resultsCounter === 0)
        ) {
            this.bytes[this.resultsCounter] = newBytes
            this.nsec[this.resultsCounter] = newNsec
            this.resultsCounter += 1
        }
    }

    getSpeedItems(direction: "download" | "upload", thread: number) {
        const speedItems: ISpeedItem[] = new Array(this.maxStoredResults)
        for (let i = 0; i < this.maxStoredResults; i++) {
            speedItems[i] = {
                direction,
                thread,
                time: this.nsec[i],
                bytes: this.bytes[i],
            }
        }
        return speedItems
    }
}
