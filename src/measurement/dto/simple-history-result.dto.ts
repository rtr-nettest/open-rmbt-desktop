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
import { ClassificationService } from "../services/classification.service"
import { CalcService } from "../services/calc.service"
import { IQoeItem } from "../interfaces/qoe-item.interface"

export const RESULT_DATE_FORMAT = "YYYY-MM-DD HH:mm:ss"

export class SimpleHistoryResult implements ISimpleHistoryResult {
    static fromLocalMeasurementResult(result: IMeasurementResult) {
        const thresholds = ClassificationService.I.getThresholds()
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
                thresholds.download,
                "biggerBetter",
            ),
            ClassificationService.I.classify(
                result.test_speed_upload,
                thresholds.upload,
                "biggerBetter",
            ),
            ClassificationService.I.classify(
                result.test_ping_shortest,
                thresholds.ping,
                "smallerBetter",
            ),
        )
    }

    static fromRTRHistoryResult(response: any) {
        const downKbit =
            (!response?.speed_download && response?.speed_download != 0) ||
            response.speed_download.trim() === ""
                ? null
                : parseFloat(response.speed_download.replace(",", "")) * 1e3
        const upKbit =
            (!response?.speed_upload && response?.speed_upload != 0) ||
            response.speed_upload.trim() === ""
                ? null
                : parseFloat(response.speed_upload.replace(",", "")) * 1e3
        const pingMs =
            (!response?.ping && response?.ping != 0) ||
            response.ping.trim() === ""
                ? null
                : parseFloat(response.ping.replace(",", ""))
        const thresholds = ClassificationService.I.getThresholds()
        return new SimpleHistoryResult(
            // The history endpoint reports `time` as a UTC instant. Convert it to
            // the viewer's local zone (like the web client does), instead of
            // formatting it in the measurement's originally recorded timezone
            // (response.timezone) — otherwise results taken in another zone show a
            // shifted time.
            dayjs(response?.time)
                .utc()
                .tz(dayjs.tz.guess())
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
                thresholds.download,
                "biggerBetter",
            ),
            ClassificationService.I.classify(
                upKbit,
                thresholds.upload,
                "biggerBetter",
            ),
            ClassificationService.I.classify(
                pingMs != null ? pingMs * 1e6 : null,
                thresholds.ping,
                "smallerBetter",
            ),
        )
    }

    static fromOpenTestResponse(
        uuid: string,
        response: any,
        openTestResponse: any,
    ) {
        const thresholds = ClassificationService.I.getThresholds()
        return new SimpleHistoryResult(
            openTestResponse?.time
                ? dayjs(openTestResponse.time, RESULT_DATE_FORMAT)
                      .utc(true)
                      .tz(dayjs.tz.guess())
                      .format(RESULT_DATE_FORMAT)
                : "",
            openTestResponse?.server_name,
            openTestResponse?.download_kbit,
            openTestResponse?.upload_kbit,
            openTestResponse?.ping_ms,
            openTestResponse?.public_ip_as_name,
            openTestResponse?.ip_anonym,
            uuid,
            response?.loop_uuid,
            false,
            CalcService.I.getOverallResultsFromSpeedCurve(
                openTestResponse?.speed_curve.download,
            ),
            CalcService.I.getOverallResultsFromSpeedCurve(
                openTestResponse?.speed_curve.upload,
            ),
            CalcService.I.getOverallPings(openTestResponse?.speed_curve.ping),
            response?.download_classification ||
                openTestResponse?.download_classification ||
                ClassificationService.I.classify(
                    openTestResponse?.download_kbit,
                    thresholds.download,
                    "biggerBetter",
                ),
            response?.upload_classification ||
                openTestResponse?.upload_classification ||
                ClassificationService.I.classify(
                    openTestResponse?.upload_kbit,
                    thresholds.upload,
                    "biggerBetter",
                ),
            response?.ping_classification ||
                openTestResponse?.ping_classification ||
                ClassificationService.I.classify(
                    // ping_ms is in milliseconds; ping thresholds are in ns.
                    openTestResponse?.ping_ms != null
                        ? openTestResponse.ping_ms * 1e6
                        : null,
                    thresholds.ping,
                    "smallerBetter",
                ),
            openTestResponse,
            response?.qoe_classification ||
                openTestResponse?.qoe_classification,
        )
    }

    constructor(
        public measurementDate: string,
        public measurementServerName: string,
        public downloadKbit: number | null,
        public uploadKbit: number | null,
        public ping: number | null,
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
        public openTestResponse?: { [key: string]: any },
        public qoeClassification?: IQoeItem[],
    ) {}
}
