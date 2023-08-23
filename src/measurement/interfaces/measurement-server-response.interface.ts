import { IMeasurementServerTypeDetails } from "./measurement-server-type-details-response.interface"

export interface IMeasurementServerResponse {
    city: string
    company: string
    email: string
    expiration: string
    id: number
    name: string
    provider: { id: number; name: string; createdDate: string }
    webAddress: string
    distance: number
    serverTypeDetails: IMeasurementServerTypeDetails[]
    active: boolean
}
