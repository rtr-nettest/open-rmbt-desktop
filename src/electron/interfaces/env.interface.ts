export interface IEnv {
    ACTIVE_LANGUAGE: string | null
    APP_VERSION: string
    CERTIFIED_TEST_INTERVAL: number
    CERTIFIED_TEST_COUNT: number
    CHECK_IP_INTERVAL_MS: number
    CMS_URL: string
    CPU_WARNING_PERCENT: number | undefined
    CROWDIN_UPDATE_AT_RUNTIME: string
    ENABLE_HOME_SCREEN_JITTER_BOX: boolean
    ENABLE_LANGUAGE_SWITCH: string
    ENABLE_LOOP_MODE: string
    FLAVOR: string
    FULL_HISTORY_RESULT_URL: string | undefined
    FULL_STATISTICS_URL: string | undefined
    FULL_MAP_URL: string | undefined
    GIT_INFO: string | undefined
    HISTORY_EXPORT_URL: string | undefined
    HISTORY_RESULTS_LIMIT: number | undefined
    HISTORY_SEARCH_URL: string | undefined
    IP_VERSION: string | null
    LOOP_MODE_MIN_INTERVAL: number
    LOOP_MODE_MAX_INTERVAL: number
    LOOP_MODE_DEFAULT_INTERVAL: number
    LOOP_MODE_MAX_DURATION: number
    OPEN_HISTORY_RESUlT_URL: string
    REPO_URL: string
    TERMS_ACCEPTED_VERSION: number
    X_NETTEST_CLIENT: string
    USER_DATA: string
    CONTROL_SERVER_URL: string
    MEASUREMENT_SERVERS_PATH: string
    OS: string
    WEBSITE_HOST: string
}
