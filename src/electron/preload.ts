import { contextBridge, ipcRenderer } from "electron"
import { Events } from "./enums/events.enum"
import { EIPVersion } from "../measurement/enums/ip-version.enum"
import { IMeasurementServerResponse } from "../measurement/interfaces/measurement-server-response.interface"
import { IPaginator } from "../ui/src/app/interfaces/paginator.interface"
import { ISort } from "../ui/src/app/interfaces/sort.interface"
import { ILoopModeInfo } from "../measurement/interfaces/measurement-registration-request.interface"

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
    setActiveClient: (client: string) =>
        ipcRenderer.send(Events.SET_ACTIVE_CLIENT, client),
    setActiveLanguage: (language: string) =>
        ipcRenderer.send(Events.SET_ACTIVE_LANGUAGE, language),
    setActiveServer: (server: IMeasurementServerResponse) =>
        ipcRenderer.send(Events.SET_ACTIVE_SERVER, server),
    setDefaultLanguage: (language: string) =>
        ipcRenderer.send(Events.SET_DEFAULT_LANGUAGE, language),
    runMeasurement: (loopModeInfo?: ILoopModeInfo) =>
        ipcRenderer.send(Events.RUN_MEASUREMENT, loopModeInfo),
    abortMeasurement: () => ipcRenderer.send(Events.ABORT_MEASUREMENT),
    getServers: () => ipcRenderer.invoke(Events.GET_SERVERS),
    getEnv: () => ipcRenderer.invoke(Events.GET_ENV),
    getCPUUsage: () => ipcRenderer.invoke(Events.GET_CPU_USAGE),
    getMeasurementState: () => ipcRenderer.invoke(Events.GET_MEASUREMENT_STATE),
    getMeasurementResult: (testUuid: string) =>
        ipcRenderer.invoke(Events.GET_MEASUREMENT_RESULT, testUuid),
    getMeasurementHistory: (paginator?: IPaginator, sort?: ISort) =>
        ipcRenderer.invoke(Events.GET_MEASUREMENT_HISTORY, paginator, sort),
    onError: (callback: (error: Error) => any) => {
        ipcRenderer.removeAllListeners(Events.ERROR)
        ipcRenderer.on(Events.ERROR, (event, error) => callback(error))
    },
    onOpenSettings: (callback: () => any) => {
        ipcRenderer.removeAllListeners(Events.OPEN_SETTINGS)
        ipcRenderer.on(Events.OPEN_SETTINGS, callback)
    },
    onRestartMeasurement: (callback: (loopCounter: number) => any) => {
        ipcRenderer.removeAllListeners(Events.RESTART_MEASUREMENT)
        ipcRenderer.on(Events.RESTART_MEASUREMENT, (_, loopCounter) =>
            callback(loopCounter)
        )
    },
    deleteLocalData: () => {
        ipcRenderer.send(Events.DELETE_LOCAL_DATA)
    },
    scheduleLoop: (loopInterval: number) => {
        ipcRenderer.send(Events.SCHEDULE_LOOP, loopInterval)
    },
})
