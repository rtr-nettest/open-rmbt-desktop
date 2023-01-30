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
import { MainStore } from "./store/main.store"
import { of, switchMap } from "rxjs"
import { TranslocoConfigExt } from "src/transloco.config"

@Injectable({ providedIn: "root" })
export class TranslocoHttpLoader implements TranslocoLoader {
    constructor(private http: HttpClient, private mainStore: MainStore) {}

    getTranslation(lang: string) {
        return this.mainStore.env$.pipe(
            switchMap((env) => {
                if (!env || env.FLAVOR === "rtr") {
                    return of([])
                }
                return this.http.get<IUITranslation[]>(
                    `${env?.CMS_URL}/ui-translations?locale.iso=${lang}&_limit=1000`,
                    {
                        headers: {
                            "Content-Type": "application/json",
                            "X-Nettest-Client": env?.X_NETTEST_CLIENT ?? "",
                        },
                    }
                )
            })
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
                defaultLang: TranslocoConfigExt["defaultLang"],
                // Remove this option if your application doesn't support changing language in runtime.
                reRenderOnLangChange: true,
                prodMode: !isDevMode(),
            }),
        },
        { provide: TRANSLOCO_LOADER, useClass: TranslocoHttpLoader },
    ],
})
export class TranslocoRootModule {}
