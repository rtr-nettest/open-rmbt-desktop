import { contextBridge, ipcRenderer } from "electron"
import { Events } from "./enums/events.enum"

contextBridge.exposeInMainWorld("electronAPI", {
    registerClient: () => ipcRenderer.invoke(Events.REGISTER_CLIENT),
    runMeasurement: () => ipcRenderer.send(Events.RUN_MEASUREMENT),
    abortMeasurement: () => ipcRenderer.send(Events.ABORT_MEASUREMENT),
    getEnv: () => ipcRenderer.invoke(Events.GET_ENV),
    getCPUUsage: () => ipcRenderer.invoke(Events.GET_CPU_USAGE),
    getMeasurementState: () => ipcRenderer.invoke(Events.GET_MEASUREMENT_STATE),
    getMeasurementResult: (testUuid: string) =>
        ipcRenderer.invoke(Events.GET_MEASUREMENT_RESULT, testUuid),
    onError: (callback: (error: Error) => any) => {
        ipcRenderer.removeAllListeners(Events.ERROR)
        ipcRenderer.on(Events.ERROR, (event, error) => callback(error))
    },
})
