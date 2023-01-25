import { contextBridge, ipcRenderer } from "electron"
import { Events } from "./enums/events.enum"

contextBridge.exposeInMainWorld("electronAPI", {
    runMeasurement: () => ipcRenderer.send(Events.RUN_MEASUREMENT),
    getEnv: () => ipcRenderer.invoke(Events.GET_ENV),
    getBasicNetworkInfo: () =>
        ipcRenderer.invoke(Events.GET_BASIC_NETWORK_INFO),
    getMeasurementState: () => ipcRenderer.invoke(Events.GET_MEASUREMENT_STATE),
    getMeasurementResult: (testUuid: string) =>
        ipcRenderer.invoke(Events.GET_MEASUREMENT_RESULT, testUuid),
    onError: (callback: (error: Error) => any) =>
        ipcRenderer.on(Events.ERROR, (event, error) => callback(error)),
})
