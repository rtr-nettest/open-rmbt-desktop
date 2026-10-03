import { Injectable } from "@angular/core"
import { I18nService } from "src/app/services/i18n.service"
import { Observable, from, map } from "rxjs"
import { I18N_CONFIG } from "src/i18n.config"
import { IEnv } from "../../../../electron/interfaces/env.interface"

@Injectable({
    providedIn: "root",
})
export class EnvResolver {
    constructor(private transloco: I18nService) {}

    resolve(): Observable<boolean> {
        return from(window.electronAPI.getEnv()).pipe(
            map((env) => {
                this.resolveLang(env)
                return true
            })
        )
    }

    private resolveLang(env: IEnv) {
        const storedLanguage = env?.ACTIVE_LANGUAGE
        if (
            I18N_CONFIG["availableLangs"].includes(storedLanguage) ||
            I18N_CONFIG["defaultLang"] === storedLanguage
        ) {
            this.transloco.setActiveLang(storedLanguage!)
        }
    }
}
