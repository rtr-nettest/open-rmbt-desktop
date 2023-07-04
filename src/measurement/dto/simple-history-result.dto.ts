import dayjs from "dayjs"
import { IMeasurementResult } from "../interfaces/measurement-result.interface"
import { IOverallResult } from "../interfaces/overall-result.interface"
import { ISimpleHistoryResult } from "../interfaces/simple-history-result.interface"

export class SimpleHistoryResult implements ISimpleHistoryResult {
    static fromLocalMeasurementResult(result: IMeasurementResult) {
        return new SimpleHistoryResult(
            dayjs(result.time).toISOString(),
            result.measurement_server ?? "-",
            result.test_speed_download,
            result.test_speed_upload,
            result.test_ping_shortest / 1e6,
            result.provider_name ?? "-",
            result.ip_address ?? "-",
            result.test_uuid ?? "",
            true
        )
    }

    fullResultLink: string

    constructor(
        public measurementDate: string,
        public measurementServerName: string,
        public downloadKbit: number,
        public uploadKbit: number,
        public ping: number,
        public providerName: string,
        public ipAddress: string,
        public testUuid?: string,
        public isLocal?: boolean,
        public downloadOverTime?: IOverallResult[],
        public uploadOverTime?: IOverallResult[],
        public downloadClass?: number,
        public uploadClass?: number,
        public pingClass?: number
    ) {
        this.fullResultLink = `${process.env.FULL_HISTORY_RESUlT_URL}${this.testUuid}`
    }
}
