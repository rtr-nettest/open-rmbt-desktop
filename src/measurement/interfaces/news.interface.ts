export interface INewsItem {
    uid?: number
    title?: string
    text?: string
}

export interface INewsRequest {
    language: string
    lastNewsUid?: number
    plattform: string
    platform: string
    softwareVersionCode: string
    uuid?: string
}

export interface INewsResponse {
    news: INewsItem[]
    error?: string[]
}
