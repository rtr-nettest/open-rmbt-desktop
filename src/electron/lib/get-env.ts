import { I18nService } from "../../measurement/services/i18n.service"
import { IEnv } from "../interfaces/env.interface"
import {
    IP_VERSION,
    MEASUREMENT_ENGINE,
    SETTINGS,
    Store,
} from "../../measurement/services/store.service"
import { TERMS_ACCEPTED_VERSION } from "../../measurement/services/store.service"
import { ACTIVE_CLIENT } from "../../measurement/services/store.service"
import { ACTIVE_SERVER } from "../../measurement/services/store.service"
import { app } from "electron"
import path from "path"
import pack from "../../../package.json"
import { IUserSettings } from "../../measurement/interfaces/user-settings-response.interface"
import { availableEngines, defaultEngine } from "./engine-availability"

export const getEnv = () => {
    const settings = Store.I.get(SETTINGS) as IUserSettings

    // Only offer engines whose binary is bundled & runnable on this platform.
    // If the stored engine isn't available here (e.g. "c" on Windows, or a
    // legacy value), reset it to the platform default (Rust, else JavaScript)
    // and persist the correction.
    const engines = availableEngines()
    let measurementEngine =
        (Store.I.get(MEASUREMENT_ENGINE) as string) || defaultEngine()
    if (!engines.includes(measurementEngine)) {
        measurementEngine = defaultEngine()
        Store.I.set(MEASUREMENT_ENGINE, measurementEngine)
    }

    // Test-server selection is normally hidden. Show it in debug mode (the
    // `--debug` CLI switch, see electron.ts) or whenever a non-default server is
    // already selected — ACTIVE_SERVER is set only for a non-default choice — so
    // an existing selection stays visible and reversible without the flag.
    const debug = process.env.CLI_DEBUG === "true"
    const showServerSelection = debug || !!Store.I.get(ACTIVE_SERVER)

    // When file logging is on — via .env (LOG_TO_FILE) or the `--file-log`
    // switch (CLI_LOG_TO_FILE) — expose the destination folder so the settings
    // screen can tell the user where the logs are written. Must match the
    // directory Logger uses: RMBT_LOG_DIR (the Electron userData path, set in
    // electron.ts) + "log". Empty string means file logging is off.
    const fileLoggingEnabled =
        process.env.LOG_TO_FILE === "true" ||
        process.env.CLI_LOG_TO_FILE === "true"
    const logPath = fileLoggingEnabled
        ? path.join(
              process.env.RMBT_LOG_DIR || app.getPath("userData"),
              "log",
          )
        : ""
    return {
        ACTIVE_LANGUAGE: I18nService.I.getActiveLanguage(),
        APP_VERSION: pack.version,
        CERTIFIED_TEST_INTERVAL: process.env.CERTIFIED_TEST_INTERVAL
            ? parseFloat(process.env.CERTIFIED_TEST_INTERVAL)
            : 15,
        CERTIFIED_TEST_COUNT: process.env.CERTIFIED_TEST_COUNT
            ? parseFloat(process.env.CERTIFIED_TEST_COUNT)
            : 8,
        CMS_URL: process.env.CMS_URL || "",
        CPU_WARNING_PERCENT: process.env.CPU_WARNING_PERCENT
            ? parseFloat(process.env.CPU_WARNING_PERCENT)
            : undefined,
        ENABLE_LANGUAGE_SWITCH: process.env.ENABLE_LANGUAGE_SWITCH || "",
        ENABLE_HOME_SCREEN_JITTER_BOX:
            process.env.ENABLE_HOME_SCREEN_JITTER_BOX === "true",
        ENABLE_LOOP_MODE: process.env.ENABLE_LOOP_MODE || "",
        DEBUG: debug,
        SHOW_SERVER_SELECTION: showServerSelection,
        LOG_PATH: logPath,
        EXCLUDE_MENU_ITEMS: process.env.EXCLUDE_MENU_ITEMS
            ? process.env.EXCLUDE_MENU_ITEMS.split(",")
            : undefined,
        WEBSITE_HOST: new URL(process.env.FULL_HISTORY_RESULT_URL ?? "").origin,
        FULL_HISTORY_RESULT_URL: process.env.FULL_HISTORY_RESULT_URL,
        FULL_STATISTICS_URL: process.env.FULL_STATISTICS_URL,
        FULL_MAP_URL: process.env.FULL_MAP_URL,
        HISTORY_RESULTS_LIMIT: process.env.HISTORY_RESULTS_LIMIT
            ? parseInt(process.env.HISTORY_RESULTS_LIMIT)
            : undefined,
        IP_VERSION: (Store.I.get(IP_VERSION) as string) || "",
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
        MEASUREMENT_ENGINE: measurementEngine,
        AVAILABLE_ENGINES: engines,
        OPEN_HISTORY_RESUlT_URL: process.env.OPEN_HISTORY_RESULT_URL || "",
        REPO_URL: pack.repository,
        TERMS_ACCEPTED_VERSION: Store.I.get(TERMS_ACCEPTED_VERSION) as number,
        X_NETTEST_CLIENT: (Store.I.get(ACTIVE_CLIENT) as string) || "",
        USER_DATA: app.getPath("temp"),
        MEASUREMENT_SERVERS_PATH: process.env.MEASUREMENT_SERVERS_PATH || "",
        CONTROL_SERVER_URL:
            process.env.CONTROL_SERVER_OVERRIDE ||
            process.env.CONTROL_SERVER_URL ||
            "",
        OS:
            process.platform === "win32"
                ? "windows"
                : process.platform === "darwin"
                  ? "macos"
                  : process.platform,
        CHECK_IP_INTERVAL_MS: process.env.CHECK_IP_INTERVAL_MS
            ? parseInt(process.env.CHECK_IP_INTERVAL_MS)
            : 10000,
        GIT_INFO: `${pack.gitInfo["branch"]}-${pack.gitInfo["hash"].slice(
            0,
            8,
        )}`,
    } as IEnv
}
