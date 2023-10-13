import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import timezone from "dayjs/plugin/timezone" // dependent on utc plugin
dayjs.extend(utc)
dayjs.extend(timezone)

import {
    IMeasurementResult,
    IPing,
} from "../interfaces/measurement-result.interface"
import { IOverallResult } from "../interfaces/overall-result.interface"
import { ISimpleHistoryResult } from "../interfaces/simple-history-result.interface"
import { IDetailedHistoryResultItem } from "../interfaces/detailed-history-result-item.interface"
import {
    ClassificationService,
    THRESHOLD_DOWNLOAD,
    THRESHOLD_PING,
    THRESHOLD_UPLOAD,
} from "../services/classification.service"
import { CalcService } from "../services/calc.service"

export const RESULT_DATE_FORMAT = "YYYY-MM-DD HH:mm:ss"

export class SimpleHistoryResult implements ISimpleHistoryResult {
    static fromLocalMeasurementResult(result: IMeasurementResult) {
        return new SimpleHistoryResult(
            dayjs(result.time).format(RESULT_DATE_FORMAT),
            result.measurement_server ?? "-",
            result.test_speed_download,
            result.test_speed_upload,
            result.test_ping_shortest / 1e6,
            result.provider_name ?? "-",
            result.ip_address ?? "-",
            result.test_uuid ?? "",
            result.loop_uuid ?? "",
            true,
            [],
            [],
            [],
            ClassificationService.I.classify(
                result.test_speed_download,
                THRESHOLD_DOWNLOAD,
                "biggerBetter"
            ),
            ClassificationService.I.classify(
                result.test_speed_upload,
                THRESHOLD_UPLOAD,
                "biggerBetter"
            ),
            ClassificationService.I.classify(
                result.test_ping_shortest,
                THRESHOLD_PING,
                "smallerBetter"
            )
        )
    }

    static fromONTHistoryResult(response: any) {
        return new SimpleHistoryResult(
            dayjs(response.measurementDate)
                .tz(dayjs.tz.guess())
                .format(RESULT_DATE_FORMAT),
            "",
            response.download,
            response.upload,
            response.ping,
            response.clientProvider,
            "",
            response.openTestUuid ?? "",
            response.loopUuid ?? "",
            false,
            [],
            [],
            [],
            ClassificationService.I.classify(
                response.download,
                THRESHOLD_DOWNLOAD,
                "biggerBetter"
            ),
            ClassificationService.I.classify(
                response.upload,
                THRESHOLD_UPLOAD,
                "biggerBetter"
            ),
            ClassificationService.I.classify(
                response.ping * 1e6,
                THRESHOLD_PING,
                "smallerBetter"
            )
        )
    }

    static fromRTRHistoryResult(response: any) {
        const downKbit = response.speed_download
            ? parseFloat(response.speed_download.replace(",", "")) * 1e3
            : 0
        const upKbit = response.speed_upload
            ? parseFloat(response.speed_upload.replace(",", "")) * 1e3
            : 0
        const pingMs = response.ping
            ? parseFloat(response.ping.replace(",", ""))
            : 0
        return new SimpleHistoryResult(
            dayjs(response?.time)
                .tz(response.timezone)
                .format(RESULT_DATE_FORMAT),
            "",
            downKbit,
            upKbit,
            pingMs,
            "",
            "",
            response.test_uuid ?? "",
            response.loop_uuid ?? "",
            false,
            [],
            [],
            [],
            ClassificationService.I.classify(
                downKbit,
                THRESHOLD_DOWNLOAD,
                "biggerBetter"
            ),
            ClassificationService.I.classify(
                upKbit,
                THRESHOLD_UPLOAD,
                "biggerBetter"
            ),
            ClassificationService.I.classify(
                pingMs * 1e6,
                THRESHOLD_PING,
                "smallerBetter"
            )
        )
    }

    static fromRTRMeasurementResult(
        uuid: string,
        response: any,
        openTestsResponse: any,
        testResultDetail: any
    ) {
        return new SimpleHistoryResult(
            dayjs(response.time).format(RESULT_DATE_FORMAT),
            openTestsResponse?.server_name,
            response.measurement_result?.download_kbit,
            response.measurement_result?.upload_kbit,
            response.measurement_result?.ping_ms,
            openTestsResponse?.public_ip_as_name,
            openTestsResponse?.ip_anonym,
            uuid,
            response.loop_uuid,
            false,
            CalcService.I.getOverallResultsFromSpeedCurve(
                openTestsResponse?.speed_curve.download
            ),
            CalcService.I.getOverallResultsFromSpeedCurve(
                openTestsResponse?.speed_curve.upload
            ),
            CalcService.I.getOverallPings(openTestsResponse?.speed_curve.ping),
            response.measurement_result?.download_classification ??
                ClassificationService.I.classify(
                    response.measurement_result?.download_kbit,
                    THRESHOLD_DOWNLOAD,
                    "biggerBetter"
                ),
            response.measurement_result?.upload_classification ??
                ClassificationService.I.classify(
                    response.measurement_result?.upload_kbit,
                    THRESHOLD_UPLOAD,
                    "biggerBetter"
                ),
            response.measurement_result?.ping_classification ??
                ClassificationService.I.classify(
                    response.measurement_result?.ping_ms * 1e6,
                    THRESHOLD_PING,
                    "smallerBetter"
                ),
            testResultDetail?.testresultdetail
        )
    }

    static fromONTMeasurementResult(uuid: string, response: any) {
        return new SimpleHistoryResult(
            response.measurement_date,
            response.measurementServerName ?? response.measurement_server_name,
            response.speed_download,
            response.speed_upload,
            response.ping ?? response.ping_median,
            response.operator ?? response.client_provider,
            response.ip_address,
            uuid,
            response.loop_uuid,
            false,
            CalcService.I.getOverallResultsFromSpeedItems(
                response.speed_detail,
                "download"
            ),
            CalcService.I.getOverallResultsFromSpeedItems(
                response.speed_detail,
                "upload"
            )
        )
    }

    constructor(
        public measurementDate: string,
        public measurementServerName: string,
        public downloadKbit: number,
        public uploadKbit: number,
        public ping: number,
        public providerName: string,
        public ipAddress: string,
        public testUuid?: string,
        public loopUuid?: string,
        public isLocal?: boolean,
        public downloadOverTime?: IOverallResult[],
        public uploadOverTime?: IOverallResult[],
        public pingOverTime?: IPing[],
        public downloadClass?: number,
        public uploadClass?: number,
        public pingClass?: number,
        public detailedHistoryResult?: IDetailedHistoryResultItem[]
    ) {}
}
