import { IMeasurementRegistrationRequest } from "../interfaces/measurement-registration-request.interface"
import { IMeasurementRegistrationResponse } from "../interfaces/measurement-registration-response.interface"
import {
    IMeasurementResult,
    IMeasurementThreadResult,
    IMeasurementThreadResultList,
    IPing,
    ISpeedItem,
} from "../interfaces/measurement-result.interface"

export interface IOverallResult {
    bytes: number
    nsec: number
    speed: number
}

export class MeasurementResult implements IMeasurementResult {
    client_name?: string
    client_version?: string
    client_uuid: string
    network_type = 0 // TODO: detect the real one, 0 == Unknown
    operating_system: string
    pings: IPing[]
    platform: string
    speed_detail: ISpeedItem[]
    test_bytes_download: number
    test_bytes_upload: number
    test_nsec_download: number
    test_nsec_upload: number
    test_num_threads: number
    test_ping_shortest: number
    test_speed_download: number
    test_speed_upload: number
    test_token: string
    test_uuid: string
    time: number
    timezone: string
    type: string
    user_server_selection: number

    constructor(
        registrationRequest: IMeasurementRegistrationRequest,
        registrationResponse: IMeasurementRegistrationResponse,
        threadResults: IMeasurementThreadResult[]
    ) {
        this.client_name = registrationRequest.client
        this.client_version = registrationRequest.client_version // TODO: get version
        this.client_uuid = registrationResponse.uuid ?? ""
        this.operating_system = registrationRequest.operating_system ?? ""
        this.pings = this.getPings(threadResults)
        this.test_ping_shortest = this.pings[0]?.timeNs
        this.platform = registrationRequest.platform ?? ""
        this.speed_detail = this.getSpeedDetail(threadResults)
        this.test_num_threads = registrationResponse.test_numthreads
        this.test_token = registrationResponse.test_token
        this.test_uuid = registrationResponse.test_uuid
        this.time = registrationRequest.time
        this.timezone = registrationRequest.timezone
        this.type = registrationRequest.type
        this.user_server_selection = registrationRequest.user_server_selection
            ? 1
            : 0
        const overallResultDown = this.calculateOverallResult(
            threadResults.map((result) => result.down)
        )
        const overallResultUp = this.calculateOverallResult(
            threadResults.map((result) => result.up)
        )
        this.test_bytes_download = overallResultDown.bytes
        this.test_nsec_download = overallResultDown.nsec
        this.test_speed_download = overallResultDown.speed
        this.test_bytes_upload = overallResultUp.bytes
        this.test_nsec_upload = overallResultUp.nsec
        this.test_speed_upload = overallResultUp.speed
    }

    private getPings(threadResults: IMeasurementThreadResult[]) {
        return (
            threadResults
                ?.reduce(
                    (acc, result) =>
                        result?.pings?.length > 0 ? result.pings : acc,
                    [] as IPing[]
                )
                .sort((a, b) => a.timeNs - b.timeNs) ?? []
        )
    }

    private getSpeedDetail(threadResults: IMeasurementThreadResult[]) {
        return (
            threadResults
                ?.reduce(
                    (acc, result) => [...acc, ...result.speedItems],
                    [] as ISpeedItem[]
                )
                .sort((a, b) => {
                    let shift = 0
                    if (a.direction === "download") {
                        shift = -1
                    } else {
                        shift = 1
                    }
                    shift += a.time - b.time
                    return shift
                }) ?? []
        )
    }

    private calculateOverallResult(
        threadResults: IMeasurementThreadResultList[]
    ): IOverallResult {
        let overallResult: IOverallResult = {
            bytes: 0,
            nsec: 0,
            speed: 0,
        }
        const numThreads = threadResults.length

        let targetTime = Infinity
        // Looking for minimal duration of all threads
        for (let i = 0; i < numThreads; i++) {
            const { nsec } = threadResults[i]
            if (nsec.length > 0) {
                if (nsec[nsec.length - 1] < targetTime) {
                    targetTime = nsec[nsec.length - 1]
                }
            }
        }
        overallResult.nsec = targetTime

        let totalBytes = 0
        for (let i = 0; i < numThreads; i++) {
            const { bytes, nsec } = threadResults[i]
            if (bytes?.length > 0 && bytes.length === nsec?.length) {
                let targetIdx = bytes.length
                // Looking for maximal bytes of the thread
                for (let j = 0; j < bytes.length; j++) {
                    if (nsec[j] >= targetTime) {
                        targetIdx = j
                        break
                    }
                }
                let calcBytes = 0
                if (targetIdx === bytes.length) {
                    // nsec[max] == targetTime
                    calcBytes = bytes[bytes.length - 1]
                } else {
                    const bytes1 = targetIdx === 0 ? 0 : bytes[targetIdx - 1]
                    const bytes2 = bytes[targetIdx]
                    const bytesDiff = bytes2 - bytes1

                    const nsec1 = targetIdx === 0 ? 0 : nsec[targetIdx - 1]
                    const nsec2 = nsec[targetIdx]
                    const nsecDiff = nsec2 - nsec1

                    const nsecCompensation = targetTime - nsec1
                    const factor = nsecCompensation / nsecDiff

                    let compensation = Math.round(bytesDiff * factor)
                    if (compensation < 0) {
                        compensation = 0
                    }
                    calcBytes = bytes1 + compensation
                }
                totalBytes += calcBytes
            }
        }
        overallResult.bytes = totalBytes
        overallResult.speed = (totalBytes * 8) / (targetTime / 1e9)
        return overallResult
    }
}
