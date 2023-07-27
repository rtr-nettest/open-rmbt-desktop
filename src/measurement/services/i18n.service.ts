import { TranslocoConfigExt } from "../../ui/src/transloco.config"
import { ACTIVE_LANGUAGE, DEFAULT_LANGUAGE, Store } from "./store.service"

export class I18nService {
    private static instance = new I18nService()

    static get I() {
        return this.instance
    }

    private constructor() {}

    getActiveLanguage() {
        let language = Store.get(ACTIVE_LANGUAGE) as string
        if (!language) {
            language = Store.get(DEFAULT_LANGUAGE) as string
        }
        if (!language) {
            language = Intl.DateTimeFormat().resolvedOptions().locale
        }
        if (!TranslocoConfigExt["availableLangs"].includes(language)) {
            language = TranslocoConfigExt["defaultLang"]
        }
        return language
    }
}
