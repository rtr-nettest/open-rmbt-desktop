import { IMainMenuItem } from "./main-menu-item.interface"
import { ITranslatable } from "./translatable.interface"

export interface IMainPage extends ITranslatable {
    content: string
    description?: string
    id: string
    keywords?: string
    menu_item: IMainMenuItem
    name: string
    enable_table_of_contents?: boolean
    updated_at?: string
    version?: number
}
