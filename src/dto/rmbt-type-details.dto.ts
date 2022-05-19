import { EMeasurementServerType } from "../enums/measurement-server-type.enum"
import { IMeasurementServerTypeDetails } from "../interfaces/measurement-server-type-details-response.interface"

export class RMBTTypeDetails implements IMeasurementServerTypeDetails {
    port = 5231
    portSsl = 5232
    encrypted = true
    serverType = EMeasurementServerType.RMBT
}
