export interface NetInterfaceInfo {
    getActiveInterfaces(): Promise<{ key: string; value: string }[]>
    getActiveInterfaceType(id: string): Promise<string | undefined>
}
