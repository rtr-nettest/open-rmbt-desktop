import axios from "axios"
import { IMeasurementRegistrationRequest } from "../interfaces/measurement-registration-request.interface"
import { IMeasurementRegistrationResponse } from "../interfaces/measurement-registration-response.interface"
import { IMeasurementServerResponse } from "../interfaces/measurement-server-response.interface"
import { IUserSettingsRequest } from "../interfaces/user-settings-request.interface"
import { IUserSetingsResponse } from "../interfaces/user-settings-response.interface"
import { Logger } from "./logger.service"

export class ControlServer {
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
}
