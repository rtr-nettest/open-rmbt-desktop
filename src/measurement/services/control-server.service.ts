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
            if (e.response) {
                Logger.I.error(e.response)
            } else {
                Logger.I.error(e)
            }
        }
    }

    async getMeasurementResult(
        uuid: string
    ): Promise<ISimpleHistoryResult | undefined> {
        Logger.I.info("Receiving measurement result by UUID: %s", uuid)
        let response: any
        let retVal: ISimpleHistoryResult | undefined = undefined
        try {
            if (process.env.RESULT_HISTORY_PATH_METHOD === "GET") {
                Logger.I.info(`GET: ${process.env.RESULT_HISTORY_PATH}/${uuid}`)
                response = (
                    await axios.get(
                        `${process.env.CONTROL_SERVER_URL}${process.env.RESULT_HISTORY_PATH}/${uuid}`,
                        { headers: this.headers }
                    )
                ).data
                if (response) {
                    retVal = {
                        measurementDate: response.measurement_date,
                        measurementServerName: response.measurementServerName,
                        speedDownload: response.speed_download,
                        speedUpload: response.speed_upload,
                        ping: response.ping,
                        providerName: response.operator,
                        ipAddress: "-", // TODO
                    }
                }
            } else if (process.env.RESULT_HISTORY_PATH_METHOD === "POST") {
                Logger.I.info(`POST: ${process.env.RESULT_HISTORY_PATH}`)
                const timezone = dayjs.tz.guess()
                response = await axios.post(
                    `${process.env.CONTROL_SERVER_URL}${process.env.RESULT_HISTORY_PATH}`,
                    {
                        test_uuid: uuid,
                        timezone,
                        capabilities: { classification: { count: 4 } },
                    },
                    { headers: this.headers }
                )
                if (response?.testresult?.length) {
                    response = response.testresult[0]
                    let openTestsResponse: any
                    if (response.open_test_uuid) {
                        openTestsResponse = await axios.get(
                            `${process.env.CONTROL_SERVER_URL}${process.env.RESULT_OPEN_TESTS_PATH}/${response.open_test_uuid}`,
                            { headers: this.headers }
                        )
                    }
                    retVal = {
                        measurementDate: dayjs(response.time).toISOString(),
                        measurementServerName: openTestsResponse?.server_name,
                        speedDownload: openTestsResponse?.download_kbit * 1e3,
                        speedUpload: openTestsResponse?.upload_kbit * 1e3,
                        ping: openTestsResponse?.ping_ms,
                        providerName: openTestsResponse?.public_ip_as_name,
                        ipAddress: openTestsResponse?.ip_anonym,
                    }
                }
            }
            Logger.I.info("Result is received: %o", retVal)
        } catch (e: any) {
            if (e.response) {
                Logger.I.error(e.response)
            } else {
                Logger.I.error(e)
            }
        }
        return retVal
    }
}
