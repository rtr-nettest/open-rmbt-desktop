import { TranslocoConfigExt } from "../../ui/src/transloco.config"
import { LANGUAGE, Store } from "./store.service"

export class I18nService {
    private static instance = new I18nService()

    static get I() {
        return this.instance
    }

    private constructor() {}

    getActiveLanguage() {
        let language = Intl.DateTimeFormat().resolvedOptions().locale
        if (!TranslocoConfigExt["availableLangs"].includes(language)) {
            language = "en"
        }
        return (Store.I.get(LANGUAGE) as string) ?? language
    }
}
