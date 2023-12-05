import { TranslocoConfigExt } from "../../ui/src/transloco.config"
import { ACTIVE_LANGUAGE, DEFAULT_LANGUAGE, Store } from "./store.service"

export class I18nService {
    static get I() {
        return this.instance
    }

    private static instance = new I18nService()

    private translations: { [key: string]: { [key: string]: string } } = {}

    private constructor() {
        for (const lang of TranslocoConfigExt["availableLangs"]) {
            try {
                this.translations[
                    lang
                ] = require(`../../ui/src/assets/i18n/${lang}.json`)
            } catch (_) {
                continue
            }
        }
    }

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

    getTranslation(key: string): string {
        return this.translations[this.getActiveLanguage()]?.[key] ?? key
    }
}

export const t = I18nService.I.getTranslation.bind(I18nService.I)
