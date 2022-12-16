export interface ISimpleHistoryResult {
    measurementDate: string
    measurementServerName: string
    uploadKbit: number
    downloadKbit: number
    ping: number
    providerName: string
    ipAddress: string
    fullResultLink: string
    downloadClass?: number
    uploadClass?: number
    pingClass?: number
}
