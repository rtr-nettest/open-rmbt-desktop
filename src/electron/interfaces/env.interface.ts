export interface IEnv {
    ACTIVE_LANGUAGE: string | null
    APP_VERSION: string
    CMS_URL: string
    CROWDIN_UPDATE_AT_RUNTIME: string
    ENABLE_LANGUAGE_SWITCH: string
    ENABLE_LOOP_MODE: string
    FLAVOR: string
    FULL_HISTORY_RESULT_URL: string | undefined
    HISTORY_EXPORT_URL: string | undefined
    HISTORY_RESULTS_LIMIT: number | undefined
    HISTORY_SEARCH_URL: string | undefined
    IP_VERSION: string | null
    OPEN_HISTORY_RESUlT_URL: string
    REPO_URL: string
    TERMS_ACCEPTED: boolean
    X_NETTEST_CLIENT: string
    USER_DATA: string
    CONTROL_SERVER_URL: string
    MEASUREMENT_SERVERS_PATH: string
    WEBSITE_HOST: string
}
