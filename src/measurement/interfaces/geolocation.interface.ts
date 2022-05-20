export interface IGeolocation {
    latitude: number
    longitude: number
    accuracy?: number
    altitude?: number
    heading?: number
    speed?: number
    provider?: string
    relativeTimeNs?: number
    time?: Date
    postalCode?: string
    city?: string
    country?: string
    county?: string
}
