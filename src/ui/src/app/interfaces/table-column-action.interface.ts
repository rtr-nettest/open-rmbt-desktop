import { ITableColumn } from "./table-column.interface"

export interface ITableColumnAction<T> {
    color?: string
    label: string
    matIcon?: string
    perform: (value: T, column: ITableColumn<T>, ...args: any[]) => void
    getDisabled?: (value: T, column: ITableColumn<T>, ...args: any[]) => boolean
    getInProgress?: (
        value: T,
        column: ITableColumn<T>,
        ...args: any[]
    ) => boolean
    getTooltip?: (value: T, column: ITableColumn<T>, ...args: any[]) => string
}
