import { contextBridge, ipcRenderer } from "electron"
import { Events } from "./events"

contextBridge.exposeInMainWorld("electronAPI", {
    runMeasurement: () => ipcRenderer.send(Events.RUN_MEASUREMENT),
    getMeasurementState: () => ipcRenderer.invoke(Events.GET_MEASUREMENT_STATE),
    onMeasurementFinish: (callback: (results: number[]) => any) =>
        ipcRenderer.on(Events.MEASUREMENT_FINISH, (event, results) =>
            callback(results)
        ),
})
