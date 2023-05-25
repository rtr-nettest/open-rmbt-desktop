import { ITranslatable } from "./translatable.interface"

export interface IMainMenuItem extends ITranslatable {
    action?: (e: MouseEvent) => any
    className?: string
    icon?: string
    label: string
    route?: string
    id?: string
    children?: IMainMenuItem[]
    createdAt?: string
    description?: string
    menu_order?: number
    parent?: string
    url?: string
    content?: string
    hidden?: boolean
}
