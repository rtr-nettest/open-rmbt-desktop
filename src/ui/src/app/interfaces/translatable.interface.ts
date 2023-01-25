import { ILocale } from "./locale.interface"

export interface ITranslatable {
    translations: {
        language: string | ILocale
        projects?: string[]
        [key: string]: any
    }[]
}
