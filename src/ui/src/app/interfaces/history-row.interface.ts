export interface IHistoryRowRTR extends IHistoryGroupItem {
    downloadClass?: string
    uploadClass?: string
    pingClass?: string
    download?: string
    upload?: string
    ping?: string
    details?: any
    loopUuid?: string
    componentField?: string
    parameters?: { [key: string]: any }
}

export interface IHistoryGroupItem {
    id?: string
    measurementDate: string
    count?: number
    groupHeader?: boolean
    hidden?: boolean
}
