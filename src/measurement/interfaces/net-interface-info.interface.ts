export interface NetInterfaceInfo {
    getActiveInterfaces(): Promise<{ key: string; value: string }[]>
    getActiveInterfaceType(): Promise<string | undefined>
}
