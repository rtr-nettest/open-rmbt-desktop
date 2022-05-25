import {
    IMeasurementThreadResultList,
    ISpeedItem,
} from "../interfaces/measurement-result.interface"
import { DownloadMessageHandler } from "../services/download-message-handler.service"
import { Logger } from "../services/logger.service"

export class SingleThreadResult {
    private coarse: IMeasurementThreadResultList = { bytes: [], nsec: [] }
    private fine: IMeasurementThreadResultList = { bytes: [], nsec: [] }
    private coarseResults = 0
    private fineResults = 0

    constructor(private maxStoredResults: number) {
        this.coarse = {
            bytes: Array(maxStoredResults),
            nsec: Array(BigInt(maxStoredResults)),
        }
        this.fine = {
            bytes: Array(maxStoredResults),
            nsec: Array(BigInt(maxStoredResults)),
        }
    }

    addResult(newBytes: number, newNsec: bigint) {
        Logger.I.info("New bytes: %d. New nsec: %d.", newBytes, newNsec)
        let addToCoarse = this.coarseResults === 0
        if (!addToCoarse) {
            const diffTime =
                newNsec -
                this.coarse.nsec[
                    (this.coarseResults - 1) % this.coarse.nsec.length
                ]
            if (diffTime > DownloadMessageHandler.minDiffTime) {
                addToCoarse = true
            }
        }
        if (this.coarse.bytes.length > 0) {
            if (addToCoarse) {
                const coarsePos =
                    (this.coarseResults += 1) % this.coarse.bytes.length
                this.coarse.bytes[coarsePos] = newBytes
                this.coarse.nsec[coarsePos] = newNsec
            }

            const finePos = (this.fineResults += 1) % this.fine.bytes.length
            this.fine.bytes[finePos] = newBytes
            this.fine.nsec[finePos] = newNsec
        }
    }

    getAllResults(): IMeasurementThreadResultList {
        const numResultsCoarse = Math.min(
            this.coarseResults,
            this.maxStoredResults
        )
        const numResultsFine = Math.min(this.fineResults, this.maxStoredResults)
        const numResults = numResultsCoarse + numResultsFine

        let resultBytes = Array(numResults)
        let resultNsec = Array(BigInt(numResults))

        let results = 0
        let posCoarse = this.coarseResults - numResultsCoarse
        let posFine = this.fineResults - numResultsFine

        while (
            results < numResults &&
            (posCoarse < this.coarseResults || posFine < this.fineResults)
        ) {
            const coarseAvail = posCoarse < this.coarseResults
            const fineAvail = posFine < this.fineResults
            const thisCoarse = coarseAvail
                ? this.coarse.nsec[posCoarse % this.coarse.nsec.length]
                : -1n
            const thisFine = fineAvail
                ? this.fine.nsec[posFine % this.fine.nsec.length]
                : -1n

            if ((thisFine <= thisCoarse || thisCoarse == -1n) && fineAvail) {
                resultNsec[results] = thisFine
                resultBytes[results++] =
                    this.fine.bytes[posFine++ % this.fine.bytes.length]

                if (thisFine == thisCoarse && coarseAvail) posCoarse++
            } else if (
                (thisCoarse < thisFine || thisFine == -1n) &&
                coarseAvail
            ) {
                resultNsec[results] = thisCoarse
                resultBytes[results++] =
                    this.coarse.bytes[posCoarse++ % this.coarse.bytes.length]
            } else {
                // shoudn't happen; avoid endless loop
                break
            }
        }

        if (results < numResults) {
            resultBytes = resultBytes.slice(0, results)
            resultNsec = resultNsec.slice(0, results)
        }
        return { bytes: resultBytes, nsec: resultNsec }
    }

    getSpeedItems(upload: boolean, thread: number) {
        const list: ISpeedItem[] = []
        let coarsNsec = 0n
        const numResultsCoarse = Math.min(
            this.coarseResults,
            this.maxStoredResults
        )
        for (let i = 0; i < numResultsCoarse; i++) {
            const time = this.coarse.nsec[i % this.coarse.nsec.length]
            const bytes = this.coarse.bytes[i % this.coarse.bytes.length]
            const item: ISpeedItem = {
                upload,
                thread,
                time,
                bytes,
            }
            list.push(item)
            coarsNsec = time
        }

        const fineNsec =
            this.fineResults === 0
                ? 0n
                : this.fine.nsec[(this.fineResults - 1) % this.fine.nsec.length]
        if (fineNsec > coarsNsec) {
            const bytes =
                this.fineResults === 0
                    ? 0
                    : this.fine.bytes[
                          (this.fineResults - 1) % this.fine.bytes.length
                      ]
            const item: ISpeedItem = {
                upload,
                thread,
                time: fineNsec,
                bytes,
            }
            list.push(item)
        }
        return list
    }
}
