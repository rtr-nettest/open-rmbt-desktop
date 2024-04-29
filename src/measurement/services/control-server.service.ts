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
    ACTIVE_CLIENT,
    ACTIVE_SERVER,
    CLIENT_UUID,
    IP_VERSION,
    LAST_NEWS_UID,
    SETTINGS,
    Store,
    TERMS_ACCEPTED_VERSION,
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
import { IPaginator } from "../../ui/src/app/interfaces/paginator.interface"
import { ISort } from "../../ui/src/app/interfaces/sort.interface"
import { BrowserWindow } from "electron"

const axios = require("axios")

dayjs.extend(utc)
dayjs.extend(tz)

export class ControlServer {
    private static instance = new ControlServer()

    static get I() {
        return this.instance
    }

    private constructor() {}

    private async getHost() {
        const ipv = Store.get(IP_VERSION) as EIPVersion
        const settings = Store.get(SETTINGS) as IUserSettings
        const settingsRequest = new UserSettingsRequest()
        const ipv6Host = settings.urls.control_ipv6_only
        const ipv4Host = settings.urls.control_ipv4_only
        let resolved: string | undefined
        let retVal = process.env.CONTROL_SERVER_URL!
        if (ipv6Host && ipv === EIPVersion.v6) {
            resolved = (
                await NetworkInfoService.I.getIpV6Info(
                    settings,
                    settingsRequest
                )
            ).publicV6
            if (resolved) {
                dns.setDefaultResultOrder("verbatim")
                retVal = "https://" + ipv6Host
            }
        } else if (ipv4Host && ipv === EIPVersion.v4) {
            resolved = (
                await NetworkInfoService.I.getIpV4Info(
                    settings,
                    settingsRequest
                )
            ).publicV4
            if (resolved) {
                dns.setDefaultResultOrder("ipv4first")
                retVal = "https://" + ipv4Host
            }
        } else {
            dns.setDefaultResultOrder("verbatim")
        }
        retVal = new URL(retVal).href.replace(/\/$/, "")
        Logger.I.info(`The current control server is: ${retVal}`)
        return retVal
    }

    private get headers() {
        const headers: { [key: string]: string } = {
            "Content-Type": "application/json",
        }
        const activeClient = Store.I.get(ACTIVE_CLIENT) as string
        if (activeClient) {
            headers["X-Nettest-Client"] = activeClient
        }
        return headers
    }

    async getNews() {
        if (!process.env.NEWS_PATH || process.env.FLAVOR === "ont") {
            return null
        }
        const lastNewsUid = Store.get(LAST_NEWS_UID) as number
        const settings = new UserSettingsRequest()
        const newsRequest: INewsRequest = {
            language: I18nService.I.getActiveLanguage(),
            plattform: settings.plattform ?? "",
            platform: settings.platform ?? "",
            softwareVersionCode: pack.version.replaceAll(".", ""),
            lastNewsUid,
            uuid: settings.uuid,
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
                Store.set(LAST_NEWS_UID, response.news[0].uid)
            }
            Logger.I.info("News are %o", response.news)
            return response.news ?? null
        } catch (e) {
            Logger.I.warn(e)
            return null
        }
    }

    async getMeasurementServersFromApi(
        request: IUserSettingsRequest
    ): Promise<IMeasurementServerResponse[]> {
        if (!process.env.MEASUREMENT_SERVERS_PATH) {
            return []
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
        const activeServer = Store.I.get(
            ACTIVE_SERVER
        ) as IMeasurementServerResponse
        let filteredServers: IMeasurementServerResponse[] = []
        if (servers?.length) {
            filteredServers = servers.filter((s) =>
                s.serverTypeDetails.some(
                    (std) => std.serverType === request.name
                )
            )
            for (const filteredServer of filteredServers) {
                filteredServer.serverTypeDetails =
                    filteredServer.serverTypeDetails.filter(
                        (std) => std.serverType === request.name
                    )
                if (activeServer?.webAddress === filteredServer.webAddress) {
                    filteredServer.active = true
                }
            }
        }
        return filteredServers.sort((a, b) => a.distance - b.distance)
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
            const settings =
                process.env.FLAVOR === "ont"
                    ? { ...response.settings[0], uuid: request.uuid }
                    : response.settings[0]
            Logger.I.info("Using settings: %o", settings)
            Store.set(CLIENT_UUID, settings.uuid)
            Store.set(SETTINGS, settings)
            if (
                process.env.FLAVOR !== "ont" &&
                Store.I.get(TERMS_ACCEPTED_VERSION) !==
                    settings.terms_and_conditions?.version
            ) {
                let termsText = (
                    await axios.get(settings.terms_and_conditions.url)
                ).data
                termsText = termsText
                    ? termsText.replace(/<title>.+<\/title>/gi, "")
                    : termsText
                return { ...settings, shouldAcceptTerms: true, termsText }
            }
            return settings
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
        const hostName = await this.getHost()
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

    async getMeasurementHistory(paginator?: IPaginator, sort?: ISort) {
        if (!process.env.HISTORY_PATH) {
            return []
        }
        let retVal: ISimpleHistoryResult[] | undefined
        try {
            if (process.env.HISTORY_RESULT_PATH_METHOD === "GET") {
                // as used by ONT
                retVal = await this.getONTHistory(paginator, sort)
            } else if (process.env.HISTORY_RESULT_PATH_METHOD === "POST") {
                // as used by RTR
                retVal = await this.getRTRHistory(paginator)
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

    async getONTHistory(paginator?: IPaginator, sort?: ISort) {
        let params = `uuid=${Store.get(CLIENT_UUID) as string}`
        if (paginator) {
            const { offset, limit } = paginator
            if (limit) {
                let page = 1
                if (offset >= limit) {
                    page = offset / limit + 1
                }
                params += `&page=${page}&size=${limit}`
            }
        }
        if (sort) {
            const { active, direction } = sort
            params += `&sort=${active},${direction}`
        } else {
            params += `&sort=measurementDate,desc`
        }
        const url = `${process.env.CONTROL_SERVER_URL}${process.env.HISTORY_PATH}?${params}`
        Logger.I.info(ELoggerMessage.GET_REQUEST, url)
        const resp = (await axios.get(url, { headers: this.headers })).data
        Logger.I.warn("Response is %o", resp)
        if (resp?.content.length) {
            return resp.content.map((hi: any) => {
                const result: ISimpleHistoryResult =
                    SimpleHistoryResult.fromONTHistoryResult(hi)
                result.paginator = {
                    totalElements: resp.totalElements,
                    totalPages: resp.totalPages,
                }
                return result
            })
        }
        throw new Error("Something unexpected happened.")
    }

    async getRTRHistory(paginator?: IPaginator) {
        const body: { [key: string]: any } = {
            language: I18nService.I.getActiveLanguage(),
            timezone: dayjs.tz.guess(),
            uuid: Store.get(CLIENT_UUID) as string,
            result_offset: paginator?.offset,
        }
        if (paginator?.limit) {
            body.result_limit = paginator.limit
        }
        Logger.I.info(
            ELoggerMessage.POST_REQUEST,
            process.env.HISTORY_PATH,
            body
        )
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
            return resp.history.map((hi: any) =>
                SimpleHistoryResult.fromRTRHistoryResult(hi)
            )
        }
        throw new Error("Something unexpected happened.")
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
                            language: I18nService.I.getActiveLanguage(),
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
                const settings = Store.get(SETTINGS) as IUserSettings
                openTestsResponse = (
                    await axios.get(
                        `${settings?.urls?.url_statistic_server}${process.env.HISTORY_RESULT_STATS_PATH}/${response.open_test_uuid}`,
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
            if (typeof e.response.data?.error === "string") {
                throw new Error(e.response.data.error)
            } else if (e.response.data?.error?.length) {
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
