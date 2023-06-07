import { ELoggerMessage } from "../enums/logger-message.enum"
import { IMeasurementThreadResultList } from "../interfaces/measurement-result.interface"
import { Logger } from "../services/logger.service"
import { DownloadMessageHandler } from "../services/message-handlers/download-message-handler.service"

export class MeasurementThreadResultList
    implements IMeasurementThreadResultList
{
    bytes: number[] = []
    nsec: number[] = []
    private resultsCounter = 0

    get maxStoredResults() {
        return this._maxStoredResults
    }

    constructor(private _maxStoredResults: number) {}

    addResult(newBytes: number, newNsec: number) {
        let nsecDiff = newNsec
        if (newNsec === Infinity) {
            return
        }
        if (this.resultsCounter > 0) {
            const prevNsec = this.nsec[this.resultsCounter - 1]
            nsecDiff = newNsec - prevNsec
        }
        if (
            this.resultsCounter < this.maxStoredResults &&
            (nsecDiff >= DownloadMessageHandler.minDiffTime ||
                this.resultsCounter === 0)
        ) {
            Logger.I.info(ELoggerMessage.NEW_BYTES, newBytes, newNsec)
            this.bytes[this.resultsCounter] = newBytes
            this.nsec[this.resultsCounter] = newNsec
            this.resultsCounter += 1
        }
    }
}
