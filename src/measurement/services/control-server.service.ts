import axios from "axios"
import { IMeasurementRegistrationRequest } from "../interfaces/measurement-registration-request.interface"
import { IMeasurementRegistrationResponse } from "../interfaces/measurement-registration-response.interface"
import { IMeasurementResult } from "../interfaces/measurement-result.interface"
import { IMeasurementServerResponse } from "../interfaces/measurement-server-response.interface"
import { ISimpleHistoryResult } from "../interfaces/simple-history-result.interface"
import { IUserSettingsRequest } from "../interfaces/user-settings-request.interface"
import {
    IUserSetingsResponse,
    IUserSettings,
} from "../interfaces/user-settings-response.interface"
import { Logger } from "./logger.service"
import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import tz from "dayjs/plugin/timezone"
import { ELoggerMessage } from "../enums/logger-message.enum"
import {
    CLIENT_UUID,
    IP_VERSION,
    LANGUAGE,
    LAST_NEWS_UID,
    SETTINGS,
    Store,
} from "./store.service"
import { DBService } from "./db.service"
import { SimpleHistoryResult } from "../dto/simple-history-result.dto"
import { INewsRequest, INewsResponse } from "../interfaces/news.interface"
import { EIPVersion } from "../enums/ip-version.enum"
import { I18nService } from "./i18n.service"
import * as pack from "../../../package.json"
import { EMeasurementFinalStatus } from "../enums/measurement-final-status"
import { Agent } from "https"
import { NetworkInfoService } from "./network-info.service"
import { UserSettingsRequest } from "../dto/user-settings-request.dto"
import * as dns from "dns"

dayjs.extend(utc)
dayjs.extend(tz)

export class ControlServer {
    private static instance = new ControlServer()

    static get I() {
        return this.instance
    }

    private constructor() {}

    private async getHost() {
        const ipv = Store.I.get(IP_VERSION) as EIPVersion
        const defaultHost = process.env.CONTROL_SERVER_URL!
        const settings = Store.I.get(SETTINGS) as IUserSettings
        const settingsRequest = new UserSettingsRequest()
        const ipv6Host = settings.urls.control_ipv6_only
        const ipv4Host = settings.urls.control_ipv4_only
        let resolved: string | undefined
        let retVal = defaultHost
        if (ipv6Host && ipv === EIPVersion.v6) {
            resolved = (
                await NetworkInfoService.I.getIPInfo(settings, settingsRequest)
            ).publicV6
            if (resolved) {
                dns.setDefaultResultOrder("verbatim")
                retVal = "https://" + ipv6Host
            }
        } else if (ipv4Host && ipv === EIPVersion.v4) {
            resolved = (
                await NetworkInfoService.I.getIPInfo(settings, settingsRequest)
            ).publicV4
            if (resolved) {
                dns.setDefaultResultOrder("ipv4first")
                retVal = "https://" + ipv4Host
            }
        } else {
            dns.setDefaultResultOrder("verbatim")
        }
        Logger.I.info(`The current control server is: ${retVal}`)
        return retVal
    }

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
            Store.I.set(SETTINGS, response.settings[0])
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
        const hostName = new URL(await this.getHost())
        const response = (
            await axios.post(
                `${hostName}${process.env.MESUREMENT_REGISTRATION_PATH}`,
                request,
                {
                    headers: this.headers,
                    httpsAgent: new Agent({ rejectUnauthorized: false }),
                }
            )
        ).data as IMeasurementRegistrationResponse
        if (response?.test_token && response?.test_uuid) {
            Logger.I.info("Registered measurement: %o", response)
            return response
        }
        if (response?.error?.length) {
            Logger.I.error("Registration error: %o", response.error)
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

    async getMeasurementHistory(offset = 0, limit?: number) {
        if (!process.env.HISTORY_PATH) {
            return []
        }
        let retVal: ISimpleHistoryResult[] | undefined
        const body: { [key: string]: any } = {
            language: I18nService.I.getActiveLanguage(),
            timezone: dayjs.tz.guess(),
            uuid: Store.I.get(CLIENT_UUID) as string,
            result_offset: offset,
        }
        if (limit) {
            body.result_limit = limit
        }
        Logger.I.info(
            ELoggerMessage.POST_REQUEST,
            process.env.HISTORY_PATH,
            body
        )
        try {
            const resp = (
                await axios.post(
                    `${process.env.CONTROL_SERVER_URL}${process.env.HISTORY_PATH}`,
                    body,
                    { headers: this.headers }
                )
            ).data
            Logger.I.warn("Response is %o", resp)
            if (resp?.error.length) {
                throw new Error(resp.error)
            }
            if (resp?.history.length) {
                retVal = resp.history.map((hi: any) =>
                    SimpleHistoryResult.fromRTRHistoryResult(hi)
                )
            }
        } catch (e) {
            retVal = await DBService.I.getAllMeasurements()
            if (!retVal) {
                this.handleError(e)
            }
        }
        Logger.I.info("The history is: %o", retVal)
        return retVal
    }

    async getMeasurementResult(
        uuid: string
    ): Promise<ISimpleHistoryResult | undefined> {
        Logger.I.info("Receiving measurement result by UUID: %s", uuid)
        let retVal: ISimpleHistoryResult | undefined
        try {
            if (process.env.HISTORY_RESULT_PATH_METHOD === "GET") {
                // as used by ONT
                retVal = await this.getONTMeasurementResult(uuid)
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
            let testResultDetail: any
            let openTestsResponse: any
            if (
                response.open_test_uuid &&
                process.env.HISTORY_RESULT_DETAILS_PATH
            ) {
                testResultDetail = (
                    await axios.post(
                        `${process.env.CONTROL_SERVER_URL}${process.env.HISTORY_RESULT_DETAILS_PATH}`,
                        {
                            ...body,
                            language: Store.I.get(LANGUAGE) as string,
                        },
                        { headers: this.headers }
                    )
                ).data
            }
            Logger.I.info("Test result detail is: %o", testResultDetail)
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
            retVal = SimpleHistoryResult.fromRTRMeasurementResult(
                uuid,
                response,
                openTestsResponse,
                testResultDetail
            )
        }
        return retVal
    }

    private async getONTMeasurementResult(uuid: string) {
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
            retVal = SimpleHistoryResult.fromONTMeasurementResult(
                uuid,
                response
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
