import { HttpClient } from "@angular/common/http"
import {
    TRANSLOCO_LOADER,
    TranslocoLoader,
    TRANSLOCO_CONFIG,
    translocoConfig,
    TranslocoModule,
} from "@ngneat/transloco"
import { Injectable, isDevMode, NgModule } from "@angular/core"
import { TranslocoConfigExt } from "src/transloco.config"

@Injectable({ providedIn: "root" })
export class TranslocoHttpLoader implements TranslocoLoader {
    constructor(private http: HttpClient) {}

    getTranslation(lang: string) {
        return this.http.get(`/assets/i18n/${lang}.json`)
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
                    let systemLang =
                        Intl.DateTimeFormat().resolvedOptions().locale
                    if (
                        !TranslocoConfigExt["availableLangs"].includes(
                            systemLang
                        )
                    ) {
                        systemLang = TranslocoConfigExt["defaultLang"]
                    }
                    window.electronAPI.setDefaultLanguage(systemLang)
                    return systemLang
                })(),
                reRenderOnLangChange: true,
                prodMode: !isDevMode(),
            }),
        },
        { provide: TRANSLOCO_LOADER, useClass: TranslocoHttpLoader },
    ],
})
export class TranslocoRootModule {}
