import { ILocale } from "./locale.interface"
import { IMainProject } from "./main-project.interface"

export interface IUITranslation {
    key: string
    language: ILocale
    project?: IMainProject
    value: string
}
