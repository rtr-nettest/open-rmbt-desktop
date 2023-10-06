import {
    app,
    BrowserWindow,
    dialog,
    ipcMain,
    Menu,
    powerMonitor,
    protocol,
    shell,
} from "electron"
if (require("electron-squirrel-startup")) app.quit()
import path from "path"
import { t } from "../measurement/services/i18n.service"
import { MeasurementRunner } from "../measurement"
import { Events } from "./enums/events.enum"
import { IEnv } from "./interfaces/env.interface"
import Protocol from "./protocol"
import {
    ACTIVE_CLIENT,
    ACTIVE_LANGUAGE,
    ACTIVE_SERVER,
    DEFAULT_LANGUAGE,
    IP_VERSION,
    Store,
    TERMS_ACCEPTED_VERSION,
} from "../measurement/services/store.service"
import { CrowdinService } from "../measurement/services/crowdin.service"
import { ControlServer } from "../measurement/services/control-server.service"
import pack from "../../package.json"
import { EIPVersion } from "../measurement/enums/ip-version.enum"
import { buildMenu } from "./menu"
import { UserSettingsRequest } from "../measurement/dto/user-settings-request.dto"
import { IMeasurementServerResponse } from "../measurement/interfaces/measurement-server-response.interface"
import { LoopService } from "../measurement/services/loop.service"
import { ILoopModeInfo } from "../measurement/interfaces/measurement-registration-request.interface"
import { EMeasurementStatus } from "../measurement/enums/measurement-status.enum"
import { ERoutes } from "../ui/src/app/enums/routes.enum"

const createWindow = () => {
    if (process.env.DEV !== "true") {
        // Needs to happen before creating/loading the browser window;
        // protocol is only used in prod
        protocol.registerBufferProtocol(
            Protocol.scheme,
            Protocol.requestHandler
        )
    }

    const { screen } = require("electron")
    const primaryDisplay = screen.getPrimaryDisplay()
    const { width, height } = primaryDisplay.workAreaSize

    const win = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: Math.min(800, width),
        minHeight: Math.min(600, height),
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            nodeIntegration: true,
        },
        icon: path.join(__dirname, "assets", "images", "icon-linux.png"),
    })

    win.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url)
        return { action: "deny" }
    })

    Menu.setApplicationMenu(buildMenu())

    if (process.env.DEV === "true") {
        win.loadURL("http://localhost:4200/")
        setTimeout(() => {
            win.webContents.openDevTools()
        }, 300)
    } else {
        win.loadURL(`${Protocol.scheme}://index.html`)
    }

    win.on("close", async (event) => {
        if (
            [
                EMeasurementStatus.END,
                EMeasurementStatus.ABORTED,
                EMeasurementStatus.NOT_STARTED,
            ].includes(MeasurementRunner.I.getCurrentPhaseState().phase) &&
            !LoopService.I.loopTimeout
        ) {
            return
        }
        const dialogOpts = {
            type: "warning" as const,
            buttons: [t("Ok"), t("Cancel")],
            title: t("Close app"),
            message: t("The currently running measurement will be aborted"),
        }
        const response = await dialog.showMessageBox(dialogOpts)
        if (response.response !== 0) {
            event.preventDefault()
        }
    })

    powerMonitor.on("suspend", async (event) => {
        if (
            [
                EMeasurementStatus.END,
                EMeasurementStatus.ABORTED,
                EMeasurementStatus.NOT_STARTED,
            ].includes(MeasurementRunner.I.getCurrentPhaseState().phase) &&
            !LoopService.I.loopTimeout
        ) {
            return
        }
        const dialogOpts = {
            type: "warning" as const,
            buttons: [t("Ok")],
            title: t("App was suspended"),
            message: t(
                "The app was suspended. The last running measurement was aborted"
            ),
        }
        const response = await dialog.showMessageBox(dialogOpts)
        if (response.response === 0) {
            LoopService.I.resetCounter()
            MeasurementRunner.I.abortMeasurement()
            win.webContents.send(Events.OPEN_SCREEN, ERoutes.HISTORY)
        }
    })
}

// Needs to be called before app is ready;
// gives our scheme access to load relative files,
// as well as local storage, cookies, etc.
// https://electronjs.org/docs/api/protocol#protocolregisterschemesasprivilegedcustomschemes
protocol.registerSchemesAsPrivileged([
    {
        scheme: Protocol.scheme,
        privileges: {
            standard: true,
            secure: true,
        },
    },
])

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit()
    } else {
        LoopService.I.resetCounter()
        MeasurementRunner.I.abortMeasurement()
    }
})

app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

ipcMain.on(Events.QUIT, () => {
    app.quit()
})

ipcMain.handle(Events.GET_TRANSLATIONS, async (event, lang: string) => {
    return await CrowdinService.I.getTranslations(lang)
})

ipcMain.handle(Events.GET_NEWS, async () => {
    return await ControlServer.I.getNews()
})

ipcMain.on(Events.ACCEPT_TERMS, (event, terms: number) => {
    Store.set(TERMS_ACCEPTED_VERSION, terms)
})

ipcMain.handle(Events.REGISTER_CLIENT, async (event) => {
    const webContents = event.sender
    try {
        const settings = await MeasurementRunner.I.registerClient()
        if (settings.shouldAcceptTerms) {
            webContents.send(Events.OPEN_SCREEN, ERoutes.TERMS_CONDITIONS)
        }
        return settings
    } catch (e) {
        webContents.send(Events.ERROR, e)
    }
})

ipcMain.on(Events.SET_IP_VERSION, (event, ipv: EIPVersion | null) => {
    Store.set(IP_VERSION, ipv)
})

ipcMain.on(Events.SET_ACTIVE_CLIENT, (event, client: string) => {
    Store.set(ACTIVE_CLIENT, client)
})

ipcMain.on(Events.SET_ACTIVE_LANGUAGE, (event, language: string) => {
    Store.set(ACTIVE_LANGUAGE, language)
})

ipcMain.on(Events.SET_DEFAULT_LANGUAGE, (event, language: string) => {
    Store.set(DEFAULT_LANGUAGE, language)
})

ipcMain.on(
    Events.SET_ACTIVE_SERVER,
    (event, server: IMeasurementServerResponse) => {
        Store.set(ACTIVE_SERVER, server)
    }
)

ipcMain.on(
    Events.RUN_MEASUREMENT,
    async (event, loopModeInfo?: ILoopModeInfo) => {
        const webContents = event.sender
        try {
            const status = await MeasurementRunner.I.runMeasurement({
                loopModeInfo,
            })
            if (status === EMeasurementStatus.ABORTED) {
                webContents.send(Events.MEASUREMENT_ABORTED)
            }
        } catch (e) {
            webContents.send(Events.ERROR, e)
        }
    }
)

ipcMain.on(Events.ABORT_MEASUREMENT, (event) => {
    const webContents = event.sender
    LoopService.I.resetCounter()
    let aborted = MeasurementRunner.I.abortMeasurement()
    if (aborted) {
        webContents.send(Events.MEASUREMENT_ABORTED)
    }
})

ipcMain.on(Events.SCHEDULE_LOOP, (event, loopInterval) => {
    const webContents = event.sender
    LoopService.I.scheduleLoop({
        interval: loopInterval,
        onTime: (counter) => {
            webContents.send(Events.RESTART_MEASUREMENT, counter)
        },
        onExpire: () => {
            webContents.send(Events.LOOP_MODE_EXPIRED)
        },
    })
})

ipcMain.on(Events.DELETE_LOCAL_DATA, () => {
    Store.wipeDataAndQuit()
})

ipcMain.handle(Events.GET_ENV, (): IEnv => {
    return {
        ACTIVE_LANGUAGE: Store.get(ACTIVE_LANGUAGE) as string,
        APP_VERSION: pack.version,
        CMS_URL: process.env.CMS_URL || "",
        CROWDIN_UPDATE_AT_RUNTIME: process.env.CROWDIN_UPDATE_AT_RUNTIME || "",
        ENABLE_LANGUAGE_SWITCH: process.env.ENABLE_LANGUAGE_SWITCH || "",
        ENABLE_LOOP_MODE: process.env.ENABLE_LOOP_MODE || "",
        FLAVOR: process.env.FLAVOR || "rtr",
        WEBSITE_HOST: new URL(process.env.FULL_HISTORY_RESULT_URL ?? "").origin,
        FULL_HISTORY_RESULT_URL: process.env.FULL_HISTORY_RESULT_URL,
        FULL_STATISTICS_URL: process.env.FULL_STATISTICS_URL,
        FULL_MAP_URL: process.env.FULL_MAP_URL,
        HISTORY_EXPORT_URL: process.env.HISTORY_EXPORT_URL,
        HISTORY_RESULTS_LIMIT: process.env.HISTORY_RESULTS_LIMIT
            ? parseInt(process.env.HISTORY_RESULTS_LIMIT)
            : undefined,
        HISTORY_SEARCH_URL: process.env.HISTORY_SEARCH_URL,
        IP_VERSION: (Store.get(IP_VERSION) as string) || "",
        LOOP_MODE_MIN_INTERVAL: process.env.LOOP_MODE_MIN_INTERVAL
            ? parseInt(process.env.LOOP_MODE_MIN_INTERVAL)
            : 5,
        LOOP_MODE_MAX_INTERVAL: process.env.LOOP_MODE_MAX_INTERVAL
            ? parseInt(process.env.LOOP_MODE_MAX_INTERVAL)
            : 120,
        LOOP_MODE_DEFAULT_INTERVAL: process.env.LOOP_MODE_DEFAULT_INTERVAL
            ? parseInt(process.env.LOOP_MODE_DEFAULT_INTERVAL)
            : 10,
        LOOP_MODE_MAX_DURATION: process.env.LOOP_MODE_MAX_DURATION
            ? parseInt(process.env.LOOP_MODE_MAX_DURATION)
            : 2880,
        OPEN_HISTORY_RESUlT_URL: process.env.OPEN_HISTORY_RESULT_URL || "",
        REPO_URL: pack.repository,
        TERMS_ACCEPTED_VERSION: Store.get(TERMS_ACCEPTED_VERSION) as number,
        X_NETTEST_CLIENT: (Store.get(ACTIVE_CLIENT) as string) || "",
        USER_DATA: app.getPath("temp"),
        MEASUREMENT_SERVERS_PATH: process.env.MEASUREMENT_SERVERS_PATH || "",
        CONTROL_SERVER_URL: process.env.CONTROL_SERVER_URL || "",
    }
})

ipcMain.handle(Events.GET_CPU_USAGE, () => {
    return MeasurementRunner.I.getCPUUsage()
})

ipcMain.handle(Events.GET_MEASUREMENT_STATE, () => {
    return MeasurementRunner.I.getCurrentPhaseState()
})

ipcMain.handle(Events.GET_MEASUREMENT_RESULT, async (event, testUuid) => {
    const webContents = event.sender
    try {
        const result = await ControlServer.I.getMeasurementResult(testUuid)
        return result
    } catch (e) {
        webContents.send(Events.ERROR, e)
    }
})

ipcMain.handle(
    Events.GET_MEASUREMENT_HISTORY,
    async (event, paginator, sort) => {
        const webContents = event.sender
        try {
            return await ControlServer.I.getMeasurementHistory(paginator, sort)
        } catch (e) {
            webContents.send(Events.ERROR, e)
        }
    }
)

ipcMain.handle(Events.GET_SERVERS, async (event) => {
    const webContents = event.sender
    try {
        return await ControlServer.I.getMeasurementServersFromApi(
            new UserSettingsRequest()
        )
    } catch (e) {
        webContents.send(Events.ERROR, e)
    }
})

app.whenReady().then(() => createWindow())
app.disableHardwareAcceleration()
