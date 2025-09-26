export interface IDynamicComponent<T = any> {
    parameters?: T
}

export interface IDynamicComponentParameters {
    [key: string]: any
}
