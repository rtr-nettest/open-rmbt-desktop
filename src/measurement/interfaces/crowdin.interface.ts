export interface ICrowdinJson {
    [key: string]: string
}

export interface ICrowdinBuild {
    data: {
        id: number
        projectId: number
        status: string
        progress: 0
        createdAt: string
        updatedAt: string
        finishedAt?: string
        attributes: {
            branchId?: number
            directoryId?: number
            targetLanguageIds: string[]
            skipUntranslatedStrings: boolean
            skipUntranslatedFiles: boolean
            exportApprovedOnly: boolean
        }
    }
}

export interface ICrowdinDownload {
    data: {
        url: string
        expireIn: string
    }
}
