import { contextBridge, ipcRenderer } from "electron"
import { Events } from "./events"

contextBridge.exposeInMainWorld("electronAPI", {
    runMeasurement: () => ipcRenderer.send(Events.RUN_MEASUREMENT),
    getCurrentState: (event: Events) => ipcRenderer.invoke(event),
    onMeasurementFinish: (callback: (results: number[]) => any) =>
        ipcRenderer.on(Events.MEASUREMENT_FINISH, (event, results) =>
            callback(results)
        ),
})
