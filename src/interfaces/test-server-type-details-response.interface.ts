import { EMeasurementServerType } from "../enums/measurement-server-type.enum"

export interface ITestServerTypeDetails {
    port: number
    portSsl: number
    encrypted: boolean
    serverType: EMeasurementServerType
}
