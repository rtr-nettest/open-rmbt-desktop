import { ILocale } from "./locale.interface"

export interface ITranslatable {
    translations: {
        language: string | ILocale
        projects?: string[]
        updated_at?: string
        [key: string]: any
    }[]
    [key: string]: any
}
