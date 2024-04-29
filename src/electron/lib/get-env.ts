import { I18nService } from "../../measurement/services/i18n.service"
import { IEnv } from "../interfaces/env.interface"
import {
    IP_VERSION,
    SETTINGS,
    Store,
} from "../../measurement/services/store.service"
import { TERMS_ACCEPTED_VERSION } from "../../measurement/services/store.service"
import { ACTIVE_CLIENT } from "../../measurement/services/store.service"
import { app } from "electron"
import pack from "../../../package.json"
import { IUserSettings } from "../../measurement/interfaces/user-settings-response.interface"

export const getEnv = () => {
    const settings = Store.get(SETTINGS) as IUserSettings
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
        CROWDIN_UPDATE_AT_RUNTIME: process.env.CROWDIN_UPDATE_AT_RUNTIME || "",
        ENABLE_LANGUAGE_SWITCH: process.env.ENABLE_LANGUAGE_SWITCH || "",
        ENABLE_HOME_SCREEN_JITTER_BOX:
            process.env.ENABLE_HOME_SCREEN_JITTER_BOX === "true",
        ENABLE_LOOP_MODE: process.env.ENABLE_LOOP_MODE || "",
        FLAVOR: process.env.FLAVOR || "rtr",
        WEBSITE_HOST: new URL(process.env.FULL_HISTORY_RESULT_URL ?? "").origin,
        FULL_HISTORY_RESULT_URL: process.env.FULL_HISTORY_RESULT_URL,
        FULL_STATISTICS_URL: process.env.FULL_STATISTICS_URL,
        FULL_MAP_URL: process.env.FULL_MAP_URL,
        HISTORY_EXPORT_URL: `${settings?.urls?.url_statistic_server}${process.env.HISTORY_EXPORT_PATH}`,
        HISTORY_RESULTS_LIMIT: process.env.HISTORY_RESULTS_LIMIT
            ? parseInt(process.env.HISTORY_RESULTS_LIMIT)
            : undefined,
        HISTORY_SEARCH_URL: `${settings?.urls?.url_statistic_server}${process.env.HISTORY_SEARCH_PATH}`,
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
            8
        )}`,
    } as IEnv
}
