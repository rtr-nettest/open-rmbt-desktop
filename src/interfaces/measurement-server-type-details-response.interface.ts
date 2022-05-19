import { EMeasurementServerType } from "../enums/measurement-server-type.enum"

export interface IMeasurementServerTypeDetails {
    port: number
    portSsl: number
    encrypted: boolean
    serverType: EMeasurementServerType
}
