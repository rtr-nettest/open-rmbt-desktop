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

dayjs.extend(utc)
dayjs.extend(tz)

export class ControlServer {
    static instance = new ControlServer()

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

    async getMeasurementServerFromApi(
        request: IUserSettingsRequest
    ): Promise<IMeasurementServerResponse | undefined> {
        if (!process.env.MEASUREMENT_SERVERS_PATH) {
            return undefined
        }
        Logger.I.info(`GET: ${process.env.MEASUREMENT_SERVERS_PATH}`)
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
        Logger.I.info(`POST: ${process.env.SETTINGS_PATH}`)
        const response = (
            await axios.post(
                `${process.env.CONTROL_SERVER_URL}${process.env.SETTINGS_PATH}`,
                request,
                { headers: this.headers }
            )
        ).data as IUserSetingsResponse
        if (response?.settings?.length) {
            Logger.I.info(`Using settings: %o`, response.settings[0])
            return response.settings[0]
        }
        if (response?.error?.length) {
            throw new Error(response.error.join(" "))
        }
        throw new Error("Did not receive any settings")
    }

    async registerMeasurement(request: IMeasurementRegistrationRequest) {
        Logger.I.info("Registration request: %o", request)
        Logger.I.info(`POST: ${process.env.MESUREMENT_REGISTRATION_PATH}`)
        const response = (
            await axios.post(
                `${process.env.CONTROL_SERVER_URL}${process.env.MESUREMENT_REGISTRATION_PATH}`,
                request,
                { headers: this.headers }
            )
        ).data as IMeasurementRegistrationResponse
        if (response?.test_token && response?.test_uuid) {
            Logger.I.info(`Registered measurement: %o`, response)
            return response
        }
        if (response?.error?.length) {
            throw new Error(response.error.join(" "))
        }
        throw new Error("Measurement was not registered")
    }

    async submitMeasurement(result: IMeasurementResult) {
        Logger.I.info("Submitting result: %o", result)
        Logger.I.info(`POST: ${process.env.RESULT_SUBMISSION_PATH}`)
        try {
            const response = (
                await axios.post(
                    `${process.env.CONTROL_SERVER_URL}${process.env.RESULT_SUBMISSION_PATH}`,
                    result,
                    { headers: this.headers }
                )
            ).data
            Logger.I.info("Result is submitted. Response: %o", response)
        } catch (e: any) {
            this.handleError(e)
        }
    }

    async getMeasurementResult(
        uuid: string
    ): Promise<ISimpleHistoryResult | undefined> {
        Logger.I.info("Receiving measurement result by UUID: %s", uuid)
        let response: any
        let retVal: ISimpleHistoryResult | undefined = undefined
        const fullResultLink = `${process.env.FULL_HISTORY_RESUlT_URL}${uuid}`
        try {
            if (process.env.HISTORY_RESULT_PATH_METHOD === "GET") {
                // as used by Specure
                Logger.I.info(`GET: ${process.env.HISTORY_RESULT_PATH}/${uuid}`)
                response = (
                    await axios.get(
                        `${process.env.CONTROL_SERVER_URL}${process.env.HISTORY_RESULT_PATH}/${uuid}`,
                        { headers: this.headers }
                    )
                ).data
                Logger.I.info("Response is: %o", retVal)
                if (response) {
                    retVal = {
                        measurementDate: response.measurement_date,
                        measurementServerName: response.measurementServerName,
                        downloadKbit: response.speed_download,
                        uploadKbit: response.speed_upload,
                        ping: response.ping,
                        providerName: response.operator,
                        ipAddress: response.ip_address,
                        fullResultLink,
                    }
                }
            } else if (process.env.HISTORY_RESULT_PATH_METHOD === "POST") {
                // as used by RTR
                Logger.I.info(`POST: ${process.env.HISTORY_RESULT_PATH}`)
                const timezone = dayjs.tz.guess()
                response = (
                    await axios.post(
                        `${process.env.CONTROL_SERVER_URL}${process.env.HISTORY_RESULT_PATH}`,
                        {
                            test_uuid: uuid,
                            timezone,
                            capabilities: { classification: { count: 4 } },
                        },
                        { headers: this.headers }
                    )
                ).data
                Logger.I.info("Response is: %o", response)
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
                    Logger.I.info(
                        "Open test response is: %o",
                        openTestsResponse
                    )
                    retVal = {
                        measurementDate: dayjs(response.time).toISOString(),
                        measurementServerName: openTestsResponse?.server_name,
                        downloadKbit: openTestsResponse?.download_kbit,
                        uploadKbit: openTestsResponse?.upload_kbit,
                        ping: openTestsResponse?.ping_ms,
                        providerName: openTestsResponse?.public_ip_as_name,
                        ipAddress: openTestsResponse?.ip_anonym,
                        fullResultLink,
                        downloadClass:
                            response.measurement_result
                                ?.download_classification,
                        uploadClass:
                            response.measurement_result?.upload_classification,
                        pingClass:
                            response.measurement_result?.ping_classification,
                    }
                }
            }
            Logger.I.info("The final result is: %o", retVal)
        } catch (e: any) {
            this.handleError(e)
        }
        return retVal
    }

    private handleError(e: any) {
        if (e.response) {
            Logger.I.error(e.response)
            if (e.response.data?.error?.length) {
                throw new Error(e.response.data.error.json(". "))
            } else {
                throw e.response.data
            }
        } else {
            Logger.I.error(e)
            throw e
        }
    }
}
