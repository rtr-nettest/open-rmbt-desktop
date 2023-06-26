import { ITableColumnAction } from "./table-column-action.interface"

export interface ITableColumn<T = any> {
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
