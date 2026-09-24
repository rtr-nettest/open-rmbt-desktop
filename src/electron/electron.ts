import { app, BrowserWindow, ipcMain, protocol } from "electron"
if (require("electron-squirrel-startup")) app.quit()

// --- Runtime CLI switches ----------------------------------------------------
// These override build-time .env values for a single launch, so a packaged
// end-user build can be reconfigured from the command line without a rebuild.
// dotenv-webpack INLINES every `process.env.X` whose key is in .env (e.g.
// LOG_TO_FILE, CONTROL_SERVER_URL) at build time, so setting those at runtime
// has no effect. Each switch below therefore maps to a var that is NOT in .env
// and thus stays a genuine runtime lookup (CLI_LOG_*, CONTROL_SERVER_OVERRIDE),
// consulted by Logger / ControlServer. Must run before any Logger.init() or
// control-server call.
//
//   --file-log       force file logging    -> <userData>/log/*.log
//   --console-log    force console logging  -> stdout
//   --host <host>    custom control server for this launch; accepts a bare
//                    host ("c01.netztest.at", assumed https) or a full URL
//                    ("https://c01.netztest.at"). Only the space-separated form
//                    "--host <host>" is valid: the value is a separate,
//                    mandatory token. "--host" with no value, and the joined
//                    "--host=<host>" form, are both rejected as errors.
{
    const argv = process.argv.slice(1)
    if (argv.includes("--file-log")) process.env.CLI_LOG_TO_FILE = "true"
    if (argv.includes("--console-log")) process.env.CLI_LOG_TO_CONSOLE = "true"

    const fail = (msg: string) => {
        console.error(msg)
        app.exit(1)
    }

    // "--host=<host>" is not accepted — "=" is not a valid separator here.
    const joined = argv.find((a) => a.startsWith("--host="))
    if (joined) {
        fail(
            `Error: invalid argument "${joined}". Use a space: --host c01.netztest.at`,
        )
    }

    // "--host <host>": the value is the next token and is mandatory (it must be
    // present and not another flag).
    const hostIdx = argv.indexOf("--host")
    if (hostIdx >= 0) {
        const host = argv[hostIdx + 1]?.trim()
        if (!host || host.startsWith("-")) {
            fail("Error: --host requires a value, e.g. --host c01.netztest.at")
        } else {
            const url = /^https?:\/\//i.test(host) ? host : `https://${host}`
            process.env.CONTROL_SERVER_OVERRIDE = url.replace(/\/+$/, "")
        }
    }
}

// Expose the OS app-data dir so worker threads (no `electron` module) write log
// files to the same location as the main process.
process.env.RMBT_LOG_DIR = app.getPath("userData")
import { Events } from "./enums/events.enum"
import Protocol from "./lib/protocol"
import {
    ACTIVE_CLIENT,
    ACTIVE_LANGUAGE,
    ACTIVE_SERVER,
    DEFAULT_LANGUAGE,
    IP_VERSION,
    MEASUREMENT_ENGINE,
    Store,
    TERMS_ACCEPTED_VERSION,
} from "../measurement/services/store.service"
import { ControlServer } from "../measurement/services/control-server.service"
import { EIPVersion } from "../measurement/enums/ip-version.enum"
import { UserSettingsRequest } from "../measurement/dto/user-settings-request.dto"
import { IMeasurementServerResponse } from "../measurement/interfaces/measurement-server-response.interface"
import { LoopService } from "../measurement/services/loop.service"
import { ILoopModeInfo } from "../measurement/interfaces/measurement-registration-request.interface"
import { ERoutes } from "../ui/src/app/enums/routes.enum"
import { WindowManager } from "./lib/window-manager"
import { getEnv } from "./lib/get-env"
import { IUserSettings } from "../measurement/interfaces/user-settings-response.interface"
import { MeasurementRunner } from "../measurement"

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
    app.quit()
})

app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0)
        WindowManager.I.createWindow()
})

ipcMain.on(Events.QUIT, () => {
    WindowManager.I.onQuit()
    app.quit()
})

ipcMain.handle(Events.GET_NEWS, async () => {
    return await ControlServer.I.getNews()
})

ipcMain.on(Events.ACCEPT_TERMS, (event, terms: number) => {
    Store.I.set(TERMS_ACCEPTED_VERSION, terms)
})

ipcMain.on(Events.SET_MEASUREMENT_ENGINE, (event, engine: string) => {
    Store.I.set(MEASUREMENT_ENGINE, engine)
})

ipcMain.handle(Events.REGISTER_CLIENT, async (event) => {
    const webContents = event.sender
    let settings = MeasurementRunner.I.settings
    if (!settings?.uuid || !settings?.urls) {
        try {
            settings = await MeasurementRunner.I.registerClient()
            if (settings.shouldAcceptTerms) {
                webContents.send(Events.OPEN_SCREEN, ERoutes.TERMS_CONDITIONS)
            }
        } catch (_) {}
    }
    const unknown = "UNKNOWN"
    MeasurementRunner.I.getIpV4Info(settings).then((ipV4Info) => {
        MeasurementRunner.I.settings = {
            ...settings,
            ipInfo: {
                publicV6:
                    MeasurementRunner.I.settings?.ipInfo?.publicV6 ?? unknown,
                privateV6:
                    MeasurementRunner.I.settings?.ipInfo?.privateV6 ?? unknown,
                privateV4: ipV4Info?.privateV4 ?? "",
                publicV4: ipV4Info?.publicV4 ?? "",
            },
        } as IUserSettings
        webContents.send(Events.SET_IP, MeasurementRunner.I.settings)
    })
    MeasurementRunner.I.getIpV6Info(settings).then((ipV6Info) => {
        MeasurementRunner.I.settings = {
            ...settings,
            ipInfo: {
                publicV4:
                    MeasurementRunner.I.settings?.ipInfo?.publicV4 ?? unknown,
                privateV4:
                    MeasurementRunner.I.settings?.ipInfo?.privateV4 ?? unknown,
                privateV6: ipV6Info?.privateV6 ?? "",
                publicV6: ipV6Info?.publicV6 ?? "",
            },
        } as IUserSettings
        webContents.send(Events.SET_IP, MeasurementRunner.I.settings)
    })
    return settings
})

ipcMain.on(Events.SET_IP_VERSION, (event, ipv: EIPVersion | null) => {
    Store.I.set(IP_VERSION, ipv)
})

ipcMain.on(Events.SET_ACTIVE_CLIENT, (event, client: string) => {
    Store.I.set(ACTIVE_CLIENT, client)
})

ipcMain.on(Events.SET_ACTIVE_LANGUAGE, (event, language: string) => {
    Store.I.set(ACTIVE_LANGUAGE, language)
})

ipcMain.on(Events.SET_DEFAULT_LANGUAGE, (event, language: string) => {
    Store.I.set(DEFAULT_LANGUAGE, language)
})

ipcMain.on(
    Events.SET_ACTIVE_SERVER,
    (event, server: IMeasurementServerResponse | null) => {
        Store.I.set(ACTIVE_SERVER, server)
    },
)

ipcMain.on(Events.RUN_MEASUREMENT, (event, loopModeInfo) =>
    MeasurementRunner.I.onRunMeasurement(event, loopModeInfo),
)

ipcMain.on(Events.ABORT_MEASUREMENT, (event) => {
    LoopService.I.resetTimeout()
    const isRunning = MeasurementRunner.I.abortMeasurement()
    if (!isRunning) {
        event.sender.send(Events.MEASUREMENT_ABORTED)
    }
})

ipcMain.on(
    Events.SCHEDULE_LOOP,
    (event, loopInterval, loopModeInfo: ILoopModeInfo) => {
        const timeFromWholeSecond = Date.now() % 1000
        setTimeout(
            () =>
                MeasurementRunner.I.onScheduleLoop(
                    event,
                    loopInterval,
                    loopModeInfo,
                ),
            1000 - timeFromWholeSecond,
        )
    },
)

ipcMain.on(Events.DELETE_LOCAL_DATA, () => {
    Store.I.wipeDataAndQuit()
})

ipcMain.handle(Events.GET_ENV, getEnv)

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
    },
)

ipcMain.handle(Events.GET_SERVERS, async (event) => {
    const webContents = event.sender
    try {
        return await ControlServer.I.getMeasurementServersFromApi(
            new UserSettingsRequest(),
        )
    } catch (e) {
        webContents.send(Events.ERROR, e)
    }
})

ipcMain.on(Events.OPEN_PDF, (_, url) => WindowManager.I.openPdf(url))

app.whenReady().then(() => WindowManager.I.createWindow())
