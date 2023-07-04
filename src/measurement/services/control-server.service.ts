import axios from "axios"
import { IMeasurementRegistrationRequest } from "../interfaces/measurement-registration-request.interface"
import { IMeasurementRegistrationResponse } from "../interfaces/measurement-registration-response.interface"
import { IMeasurementResult } from "../interfaces/measurement-result.interface"
import { IMeasurementServerResponse } from "../interfaces/measurement-server-response.interface"
import { ISimpleHistoryResult } from "../interfaces/simple-history-result.interface"
import { IUserSettingsRequest } from "../interfaces/user-settings-request.interface"
import { IUserSetingsResponse } from "../interfaces/user-settings-response.interface"
import { Logger } from "./logger.service"
import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import tz from "dayjs/plugin/timezone"
import { RMBTClient } from "./rmbt-client.service"
import { ELoggerMessage } from "../enums/logger-message.enum"
import { CLIENT_UUID, IP_VERSION, LAST_NEWS_UID, Store } from "./store.service"
import { DBService } from "./db.service"
import { SimpleHistoryResult } from "../dto/simple-history-result.dto"
import { INewsRequest, INewsResponse } from "../interfaces/news.interface"
import { EIPVersion } from "../enums/ip-version.enum"
import { I18nService } from "./i18n.service"
import * as pack from "../../../package.json"
import { EMeasurementFinalStatus } from "../enums/measurement-final-status"

dayjs.extend(utc)
dayjs.extend(tz)

export class ControlServer {
    private static instance = new ControlServer()

    static get I() {
        return this.instance
    }

    private constructor() {}

    private get headers() {
        const headers: { [key: string]: string } = {
            "Content-Type": "application/json",
        }
        if (process.env.X_NETTEST_CLIENT) {
            headers["X-Nettest-Client"] = process.env.X_NETTEST_CLIENT
        }
        return headers
    }

    async getNews() {
        if (!process.env.NEWS_PATH) {
            return null
        }
        const lastNewsUid = Store.I.get(LAST_NEWS_UID) as number
        const newsRequest: INewsRequest = {
            language: I18nService.I.getActiveLanguage(),
            plattform: "Desktop",
            softwareVersionCode: pack.version.replaceAll(".", ""),
            lastNewsUid,
            uuid: Store.I.get(CLIENT_UUID) as string,
        }
        Logger.I.info(
            ELoggerMessage.POST_REQUEST,
            process.env.NEWS_PATH,
            newsRequest
        )
        try {
            const response = (
                await axios.post(
                    `${process.env.CONTROL_SERVER_URL}${process.env.NEWS_PATH}`,
                    newsRequest
                )
            ).data as INewsResponse
            if (response.error?.length) {
                throw response.error
            }
            if (response.news?.[0]?.uid) {
                Store.I.set(LAST_NEWS_UID, response.news[0].uid)
            }
            Logger.I.info("News are %o", response.news)
            return response.news ?? null
        } catch (e) {
            Logger.I.warn(e)
            return null
        }
    }

    async getMeasurementServerFromApi(
        request: IUserSettingsRequest
    ): Promise<IMeasurementServerResponse | undefined> {
        if (!process.env.MEASUREMENT_SERVERS_PATH) {
            return undefined
        }
        Logger.I.info(
            ELoggerMessage.GET_REQUEST,
            process.env.MEASUREMENT_SERVERS_PATH
        )
        const servers = (
            await axios.get(
                `${process.env.CONTROL_SERVER_URL}${process.env.MEASUREMENT_SERVERS_PATH}`,
                { headers: this.headers }
            )
        ).data as IMeasurementServerResponse[]
        if (servers?.length) {
            const filteredServer = servers.find((s) =>
                s.serverTypeDetails.some(
                    (std) => std.serverType === request.name
                )
            )
            if (filteredServer) {
                filteredServer.serverTypeDetails =
                    filteredServer.serverTypeDetails.filter(
                        (std) => std.serverType === request.name
                    )
            }
            Logger.I.info("Using server: %o", filteredServer)
            return filteredServer
        }
    }

    async getUserSettings(request: IUserSettingsRequest) {
        Logger.I.info(
            ELoggerMessage.POST_REQUEST,
            process.env.SETTINGS_PATH,
            request
        )
        const response = (
            await axios.post(
                `${process.env.CONTROL_SERVER_URL}${process.env.SETTINGS_PATH}`,
                request,
                { headers: this.headers }
            )
        ).data as IUserSetingsResponse
        if (response?.settings?.length) {
            Logger.I.info("Using settings: %o", response.settings[0])
            Store.I.set(CLIENT_UUID, response.settings[0].uuid)
            return response.settings[0]
        }
        if (response?.error?.length) {
            throw new Error(response.error.join(" "))
        }
        throw new Error("Did not receive any settings")
    }

    async registerMeasurement(request: IMeasurementRegistrationRequest) {
        Logger.I.info(
            ELoggerMessage.POST_REQUEST,
            process.env.MESUREMENT_REGISTRATION_PATH,
            request
        )
        const response = (
            await axios.post(
                `${process.env.CONTROL_SERVER_URL}${process.env.MESUREMENT_REGISTRATION_PATH}`,
                request,
                { headers: this.headers }
            )
        ).data as IMeasurementRegistrationResponse
        if (response?.test_token && response?.test_uuid) {
            Logger.I.info("Registered measurement: %o", response)
            response.ip_version = Store.I.get(IP_VERSION) as EIPVersion
            return response
        }
        if (response?.error?.length) {
            throw new Error(response.error.join(" "))
        }
        Logger.I.error("Registration response: %o", response)
        throw new Error("Measurement was not registered")
    }

    async submitMeasurement(result: IMeasurementResult) {
        Logger.I.info(
            ELoggerMessage.POST_REQUEST,
            process.env.RESULT_SUBMISSION_PATH,
            result
        )
        try {
            const response = (
                await axios.post(
                    `${process.env.CONTROL_SERVER_URL}${process.env.RESULT_SUBMISSION_PATH}`,
                    result,
                    { headers: this.headers }
                )
            ).data
            await DBService.I.saveMeasurement({
                ...result,
                sent_to_server: true,
            })
            Logger.I.info("Result is submitted. Response: %o", response)
        } catch (e: any) {
            if (e.response.status != 400) {
                await DBService.I.saveMeasurement(result)
            }
            if (result.test_status !== EMeasurementFinalStatus.ABORTED) {
                this.handleError(e)
            }
        }
    }

    async submitUnsentMeasurements() {
        try {
            const unsent = await DBService.I.getUnsentMeasurements()
            if (!unsent.length) {
                return
            }
            const promises = unsent.map((result) =>
                this.submitMeasurement(result)
            )
            await Promise.allSettled(promises)
        } catch (e: any) {
            this.handleError(e)
        }
    }

    async getMeasurementResult(
        uuid: string
    ): Promise<ISimpleHistoryResult | undefined> {
        Logger.I.info("Receiving measurement result by UUID: %s", uuid)
        let retVal: ISimpleHistoryResult | undefined
        try {
            if (process.env.HISTORY_RESULT_PATH_METHOD === "GET") {
                // as used by Specure
                retVal = await this.getSpecureMeasurementResult(uuid)
            } else if (process.env.HISTORY_RESULT_PATH_METHOD === "POST") {
                // as used by RTR
                retVal = await this.getRTRMeasurementResult(uuid)
            }
        } catch (e: any) {
            retVal = await DBService.I.getMeasurementByUuid(uuid)
            if (!retVal) {
                this.handleError(e)
            }
        }
        Logger.I.info("The final result is: %o", retVal)
        return retVal
    }

    private async getRTRMeasurementResult(uuid: string) {
        let response: any
        let retVal: ISimpleHistoryResult | undefined = undefined
        const body = {
            test_uuid: uuid,
            timezone: dayjs.tz.guess(),
            capabilities: { classification: { count: 4 } },
        }
        Logger.I.info(
            ELoggerMessage.POST_REQUEST,
            process.env.HISTORY_RESULT_PATH,
            body
        )
        response = (
            await axios.post(
                `${process.env.CONTROL_SERVER_URL}${process.env.HISTORY_RESULT_PATH}`,
                body,
                { headers: this.headers }
            )
        ).data
        Logger.I.info(ELoggerMessage.RESPONSE, response)
        if (response?.testresult?.length) {
            response = response.testresult[0]
            let openTestsResponse: any
            if (
                response.open_test_uuid &&
                process.env.HISTORY_RESULT_STATS_PATH
            ) {
                openTestsResponse = (
                    await axios.get(
                        `${process.env.CONTROL_SERVER_URL}${process.env.HISTORY_RESULT_STATS_PATH}/${response.open_test_uuid}`,
                        { headers: this.headers }
                    )
                ).data
            }
            Logger.I.info("Open test response is: %o", openTestsResponse)
            retVal = new SimpleHistoryResult(
                dayjs(response.time).toISOString(),
                openTestsResponse?.server_name,
                openTestsResponse?.download_kbit,
                openTestsResponse?.upload_kbit,
                openTestsResponse?.ping_ms,
                openTestsResponse?.public_ip_as_name,
                openTestsResponse?.ip_anonym,
                uuid,
                false,
                [],
                [],
                response.measurement_result?.download_classification,
                response.measurement_result?.upload_classification,
                response.measurement_result?.ping_classification
            )
        }
        return retVal
    }

    private async getSpecureMeasurementResult(uuid: string) {
        let response: any
        let retVal: ISimpleHistoryResult | undefined = undefined
        response = (
            await axios.get(
                `${process.env.CONTROL_SERVER_URL}${process.env.HISTORY_RESULT_PATH}/${uuid}`,
                { headers: this.headers }
            )
        ).data
        Logger.I.info(ELoggerMessage.RESPONSE, response)
        if (response) {
            retVal = new SimpleHistoryResult(
                response.measurement_date,
                response.measurementServerName ??
                    response.measurement_server_name,
                response.speed_download,
                response.speed_upload,
                response.ping ?? response.ping_median,
                response.operator ?? response.client_provider,
                response.ip_address,
                uuid,
                false,
                RMBTClient.getOverallResultsFromSpeedItems(
                    response.speed_detail,
                    "download"
                ),
                RMBTClient.getOverallResultsFromSpeedItems(
                    response.speed_detail,
                    "upload"
                )
            )
        }
        return retVal
    }

    private handleError(e: any) {
        if (e.response) {
            Logger.I.error(e.response)
            if (e.response.data?.error?.length) {
                throw new Error(e.response.data.error.join(". "))
            } else {
                throw e.response.data
            }
        } else {
            Logger.I.error(e)
            throw e
        }
    }
}
