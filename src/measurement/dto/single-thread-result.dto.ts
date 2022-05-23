import { IMeasurementThreadResultList } from "../interfaces/measurement-result.interface"
import { DownloadMessageHandler } from "../services/download-message-handler.service"

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
        console.log(newBytes, newNsec)
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
}
