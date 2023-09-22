export interface IHistoryRowRTR {
    id: string
    count: number
    measurementDate: string
    download: string
    upload: string
    ping: string
    details: string
}

export interface IHistoryRowONT {
    id: string
    measurementDate: string
    time: string
    providerName: string
    download: string
    upload: string
    ping: string
}
