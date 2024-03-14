import { contextBridge, ipcRenderer } from "electron"
import { Events } from "./enums/events.enum"
import { EIPVersion } from "../measurement/enums/ip-version.enum"
import { IMeasurementServerResponse } from "../measurement/interfaces/measurement-server-response.interface"
import { IPaginator } from "../ui/src/app/interfaces/paginator.interface"
import { ISort } from "../ui/src/app/interfaces/sort.interface"
import { ILoopModeInfo } from "../measurement/interfaces/measurement-registration-request.interface"
import { ERoutes } from "../ui/src/app/enums/routes.enum"
import { IUserSettings } from "../measurement/interfaces/user-settings-response.interface"

contextBridge.exposeInMainWorld("electronAPI", {
    quit: () => ipcRenderer.send(Events.QUIT),
    getTranslations: (lang: string) =>
        ipcRenderer.invoke(Events.GET_TRANSLATIONS, lang),
    getNews: () => ipcRenderer.invoke(Events.GET_NEWS),
    acceptTerms: (terms: number) =>
        ipcRenderer.send(Events.ACCEPT_TERMS, terms),
    registerClient: () => ipcRenderer.invoke(Events.REGISTER_CLIENT),
    setIpVersion: (ipv: EIPVersion | null) =>
        ipcRenderer.send(Events.SET_IP_VERSION, ipv),
    setActiveClient: (client: string) =>
        ipcRenderer.send(Events.SET_ACTIVE_CLIENT, client),
    setActiveLanguage: (language: string) =>
        ipcRenderer.send(Events.SET_ACTIVE_LANGUAGE, language),
    setActiveServer: (server: IMeasurementServerResponse | null) =>
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
    onAppResumed: (callback: () => any) => {
        ipcRenderer.removeAllListeners(Events.APP_RESUMED)
        ipcRenderer.on(Events.APP_RESUMED, () => callback())
    },
    onAppSuspended: (callback: () => any) => {
        ipcRenderer.removeAllListeners(Events.APP_SUSPENDED)
        ipcRenderer.on(Events.APP_SUSPENDED, () => callback())
    },
    onError: (callback: (error: Error) => any) => {
        ipcRenderer.removeAllListeners(Events.ERROR)
        ipcRenderer.on(Events.ERROR, (event, error) => callback(error))
    },
    onMeasurementAborted: (callback: () => any) => {
        ipcRenderer.removeAllListeners(Events.MEASUREMENT_ABORTED)
        ipcRenderer.on(Events.MEASUREMENT_ABORTED, (event) => callback())
    },
    offMeasurementAborted: () => {
        ipcRenderer.removeAllListeners(Events.MEASUREMENT_ABORTED)
    },
    onOpenScreen: (callback: (route: ERoutes) => any) => {
        ipcRenderer.removeAllListeners(Events.OPEN_SCREEN)
        ipcRenderer.on(Events.OPEN_SCREEN, (event, route) => callback(route))
    },
    onRestartMeasurement: (callback: (loopCounter: number) => any) => {
        ipcRenderer.removeAllListeners(Events.RESTART_MEASUREMENT)
        ipcRenderer.on(Events.RESTART_MEASUREMENT, (_, loopCounter) =>
            callback(loopCounter)
        )
    },
    onLoopModeExpired: (callback: () => any) => {
        ipcRenderer.removeAllListeners(Events.LOOP_MODE_EXPIRED)
        ipcRenderer.on(Events.LOOP_MODE_EXPIRED, callback)
    },
    onMaxTestsReached: (callback: () => any) => {
        ipcRenderer.removeAllListeners(Events.MAX_TESTS_REACHED)
        ipcRenderer.on(Events.MAX_TESTS_REACHED, callback)
    },
    openPdf: (url: string) => {
        ipcRenderer.send(Events.OPEN_PDF, url)
    },
    onSetIp: (callback: (settings: IUserSettings) => any) => {
        ipcRenderer.removeAllListeners(Events.SET_IP)
        ipcRenderer.on(Events.SET_IP, (_, settings) => callback(settings))
    },
    deleteLocalData: () => {
        ipcRenderer.send(Events.DELETE_LOCAL_DATA)
    },
    scheduleLoop: (loopInterval: number, loopModeInfo: ILoopModeInfo) => {
        ipcRenderer.send(Events.SCHEDULE_LOOP, loopInterval, loopModeInfo)
    },
})
