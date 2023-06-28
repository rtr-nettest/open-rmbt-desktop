import { contextBridge, ipcRenderer } from "electron"
import { Events } from "./enums/events.enum"
import { EIPVersion } from "../measurement/enums/ip-version.enum"

contextBridge.exposeInMainWorld("electronAPI", {
    quit: () => ipcRenderer.send(Events.QUIT),
    getTranslations: (lang: string) =>
        ipcRenderer.invoke(Events.GET_TRANSLATIONS, lang),
    getNews: () => ipcRenderer.invoke(Events.GET_NEWS),
    acceptTerms: (terms: string) =>
        ipcRenderer.send(Events.ACCEPT_TERMS, terms),
    registerClient: () => ipcRenderer.invoke(Events.REGISTER_CLIENT),
    setIpVersion: (ipv: EIPVersion | null) =>
        ipcRenderer.send(Events.SET_IP_VERSION, ipv),
    setLanguage: (language: string) =>
        ipcRenderer.send(Events.SET_LANGUAGE, language),
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
