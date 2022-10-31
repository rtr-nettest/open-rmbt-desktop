import { contextBridge, ipcRenderer } from "electron"
import { Events } from "./events"

contextBridge.exposeInMainWorld("electronAPI", {
    runMeasurement: () => ipcRenderer.send(Events.RUN_MEASUREMENT),
    getCurrentPing: () => ipcRenderer.invoke(Events.GET_CURRENT_PING),
    getCurrentDownload: () => ipcRenderer.invoke(Events.GET_CURRENT_DOWNLOAD),
    getCurrentUpload: () => ipcRenderer.invoke(Events.GET_CURRENT_UPLOAD),
    onMeasurementFinish: (callback: (results: number[]) => any) =>
        ipcRenderer.on(Events.MEASUREMENT_FINISH, (event, results) =>
            callback(results)
        ),
})
