export interface IEnv {
    CMS_URL: string
    FLAVOR: string
    X_NETTEST_CLIENT: string
    ENABLE_LOOP_MODE: string
    CROWDIN_UPDATE_AT_RUNTIME: string
    APP_VERSION: string
    REPO_URL: string
    ENABLE_LANGUAGE_SWITCH: string
    IP_VERSION: string | null
    TERMS_ACCEPTED: boolean
    LANGUAGE: string | null
}
