import { IMeasurementResult } from "../interfaces/measurement-result.interface"

export class MeasurementResult implements IMeasurementResult {
    encryption = "NONE"
    pings = []
    speedItems = []
}
