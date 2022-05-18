import { ITestServerTypeDetails } from "./test-server-type-details-response.interface"

export interface ITestServerResponse {
    city: string
    company: string
    email: string
    expiration: string
    id: number
    name: string
    provider: { id: number; name: string; createdDate: string }
    webAddress: string
    distance: number
    serverTypeDetails: ITestServerTypeDetails[]
}
