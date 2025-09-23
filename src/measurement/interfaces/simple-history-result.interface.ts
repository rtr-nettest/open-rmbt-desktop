import { IPing } from "./measurement-result.interface"
import { IOverallResult } from "./overall-result.interface"
import { IQoeItem } from "./qoe-item.interface"

export interface ISimpleHistoryPaginator {
    totalPages: number
    totalElements: number
}

export interface ISimpleHistoryResult {
    measurementDate: string
    measurementServerName: string
    uploadKbit: number | null
    uploadOverTime?: IOverallResult[]
    downloadKbit: number | null
    downloadOverTime?: IOverallResult[]
    ping: number | null
    pingOverTime?: IPing[]
    providerName: string
    ipAddress: string
    downloadClass?: number
    uploadClass?: number
    pingClass?: number
    testUuid?: string
    loopUuid?: string
    isLocal?: boolean
    paginator?: ISimpleHistoryPaginator
    openTestResponse?: { [key: string]: any }
    qoeClassification?: IQoeItem[]
}
