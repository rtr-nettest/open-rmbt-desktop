import { Injectable } from "@angular/core"
import { HttpClient } from "@angular/common/http"
import { BehaviorSubject, Observable, firstValueFrom, map } from "rxjs"
import { I18N_CONFIG } from "src/i18n.config"

/** A flat key -> translated-string dictionary for one language. */
export type Translation = { [key: string]: any }

/**
 * Minimal static-translation service: loads per-language JSON dictionaries from
 * assets, looks up keys, and switches language at runtime. Replaces Transloco —
 * the app only needs key lookup + runtime language switching (interpolation is
 * handled separately by the `sprintf` pipe).
 */
@Injectable({
    providedIn: "root",
})
export class I18nService {
    private translations: { [lang: string]: Translation } = {}
    private activeLang: string = I18N_CONFIG["defaultLang"]
    // Emits the active dictionary now and whenever the language changes; the
    // *localize directive and localize pipe re-render off this.
    private translation$ = new BehaviorSubject<Translation>({})

    constructor(private http: HttpClient) {}

    /** Load a language (cached) and make it active. */
    async setActiveLang(lang: string): Promise<void> {
        await this.load(lang)
        this.activeLang = lang
        this.translation$.next(this.translations[lang] ?? {})
    }

    private async load(lang: string): Promise<void> {
        if (this.translations[lang]) {
            return
        }
        try {
            this.translations[lang] =
                (await firstValueFrom(
                    this.http.get<Translation>(`/assets/i18n/${lang}.json`),
                )) ?? {}
        } catch {
            this.translations[lang] = {}
        }
    }

    getActiveLang(): string {
        return this.activeLang
    }

    /**
     * Synchronous lookup; returns the key itself when a translation is missing.
     * Supports `{{name}}` interpolation when `params` are given.
     */
    translate(key: string, params?: { [name: string]: any }): string {
        let value: string = this.translations[this.activeLang]?.[key] ?? key
        if (params) {
            value = value.replace(/\{\{\s*([^}\s]+)\s*\}\}/g, (match, name) =>
                params[name] != null ? String(params[name]) : match,
            )
        }
        return value
    }

    /** The full dictionary for a (loaded) language. */
    getTranslation(lang?: string): Translation {
        return this.translations[lang ?? this.activeLang] ?? {}
    }

    /** Emits the active dictionary now and on every language change. */
    selectTranslation(): Observable<Translation> {
        return this.translation$.asObservable()
    }

    /** Emits a single key's translation now and on every language change. */
    selectTranslate(key: string): Observable<string> {
        return this.translation$.pipe(map(() => this.translate(key)))
    }

    getActiveBrowserLang(): string {
        const activeLang = this.getActiveLang()
        if (!I18N_CONFIG["browserLangs"].includes(activeLang)) {
            return I18N_CONFIG["defaultBrowserLang"]
        }
        return activeLang
    }
}
