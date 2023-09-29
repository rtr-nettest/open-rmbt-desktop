export interface IHistoryRowRTR extends IHistoryGroupItem {
    download?: string
    upload?: string
    ping?: string
    details?: string
    loopUuid?: string
}

export interface IHistoryRowONT extends IHistoryGroupItem {
    time: string
    providerName: string
    download: string
    upload: string
    ping: string
}

export interface IHistoryGroupItem {
    id?: string
    measurementDate: string
    count?: number
    groupHeader?: boolean
    hidden?: boolean
}
