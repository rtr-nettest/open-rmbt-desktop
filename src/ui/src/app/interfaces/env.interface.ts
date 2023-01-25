export interface IEnv {
    ASSETS_FOLDER: string
    CONTROL_SERVER_URL: string
    FLAVOR: "rtr" | "ont"
    FULL_HISTORY_RESUlT_URL: string
    HISTORY_RESULT_PATH_METHOD: string
    HISTORY_RESULT_PATH: string
    HISTORY_RESULT_STATS_PATH: string
    LOG_CPU_USAGE: string
    LOG_TO_CONSOLE: string
    LOG_TO_FILE: string
    LOG_WORKERS: string
    MEASUREMENT_SERVERS_PATH: string
    MESUREMENT_REGISTRATION_PATH: string
    PLATFORM_CLI: string
    RESULT_SUBMISSION_PATH: string
    SETTINGS_PATH: string
    X_NETTEST_CLIENT: string
}
