export interface IDynamicComponent {
    parameters?: IDynamicComponentParameters
}

export interface IDynamicComponentParameters {
    [key: string]: any
}
