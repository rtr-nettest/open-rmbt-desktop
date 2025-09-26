import { Type } from "@angular/core"
import { ITableColumnAction } from "./table-column-action.interface"
import { IDynamicComponent } from "./dynamic-component.interface"

export interface ITableColumn<T = any> {
    component?: Type<IDynamicComponent<any>>
    getComponentParameters?: (value: T) => { [key: string]: any }
    columnDef: string
    getActions?: (
        value: T,
        column: ITableColumn<T>,
        ...args: any[]
    ) => ITableColumnAction<T>[]
    getNgClass?: (
        value: T,
        column: ITableColumn<T>,
        ...args: any[]
    ) => string | string[] | Set<string> | { [klass: string]: any }
    getTooltip?: (value: T, column: ITableColumn<T>, ...args: any[]) => string
    footer?: string
    header: string
    isSortable?: boolean
    isComponent?: boolean
    isDate?: boolean
    isExpandable?: boolean
    isHtml?: boolean
    justify?: "flex-start" | "center" | "flex-end"
    key?: string
    link?: (...args: any[]) => string
    linkDisabled?: (value: T) => boolean
    subHeader?: string
    transformValue?: (
        value: T,
        column: ITableColumn<T>,
        index?: number,
        ...args: any[]
    ) => any
    width?: number | string
}
