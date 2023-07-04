import { HttpClient } from "@angular/common/http"
import {
    TRANSLOCO_LOADER,
    TranslocoLoader,
    TRANSLOCO_CONFIG,
    translocoConfig,
    TranslocoModule,
} from "@ngneat/transloco"
import { Injectable, isDevMode, NgModule } from "@angular/core"
import { IUITranslation } from "./interfaces/ui-translation.interface"
import { from, of, switchMap } from "rxjs"
import { TranslocoConfigExt } from "src/transloco.config"
import { IEnv } from "../../../electron/interfaces/env.interface"
import { MainStore } from "./store/main.store"

@Injectable({ providedIn: "root" })
export class TranslocoHttpLoader implements TranslocoLoader {
    constructor(private http: HttpClient, private store: MainStore) {}

    getTranslation(lang: string) {
        return from(window.electronAPI.getEnv()).pipe(
            switchMap((env) => {
                if (env && env.FLAVOR === "ont") {
                    return this.getFromCms(env, lang)
                } else if (env.CROWDIN_UPDATE_AT_RUNTIME === "true") {
                    return from(window.electronAPI.getTranslations(lang))
                } else {
                    return of([])
                }
            }),
            switchMap((remote) => {
                if (!remote || !remote.length) {
                    return this.http.get(`/assets/i18n/${lang}.json`)
                }
                return of(remote)
            })
        )
    }

    private getFromCms(env: IEnv, lang: string) {
        return this.http.get<IUITranslation[]>(
            `${env?.CMS_URL}/ui-translations?locale.iso=${lang}&_limit=1000`,
            {
                headers: {
                    "Content-Type": "application/json",
                    "X-Nettest-Client": env?.X_NETTEST_CLIENT ?? "",
                },
            }
        )
    }
}

@NgModule({
    exports: [TranslocoModule],
    providers: [
        {
            provide: TRANSLOCO_CONFIG,
            useValue: translocoConfig({
                availableLangs: TranslocoConfigExt["availableLangs"],
                defaultLang: (() => {
                    const systemLang =
                        Intl.DateTimeFormat().resolvedOptions().locale
                    if (
                        TranslocoConfigExt["availableLangs"].includes(
                            systemLang
                        )
                    ) {
                        return systemLang
                    }
                    return TranslocoConfigExt["defaultLang"]
                })(),
                reRenderOnLangChange: true,
                prodMode: !isDevMode(),
            }),
        },
        { provide: TRANSLOCO_LOADER, useClass: TranslocoHttpLoader },
    ],
})
export class TranslocoRootModule {}
