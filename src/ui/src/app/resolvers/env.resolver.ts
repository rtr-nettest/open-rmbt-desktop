import { Injectable } from "@angular/core"
import { TranslocoService } from "@ngneat/transloco"
import { Observable, from, map } from "rxjs"
import { TranslocoConfigExt } from "src/transloco.config"
import { IEnv } from "../../../../electron/interfaces/env.interface"

@Injectable({
    providedIn: "root",
})
export class EnvResolver {
    constructor(private transloco: TranslocoService) {}

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
            TranslocoConfigExt["availableLangs"].includes(storedLanguage) ||
            TranslocoConfigExt["defaultLang"] === storedLanguage
        ) {
            this.transloco.setActiveLang(storedLanguage!)
        }
    }
}
