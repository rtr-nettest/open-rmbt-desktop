import { Injectable } from "@angular/core"
import { TranslocoService } from "@ngneat/transloco"
import { TranslocoConfigExt } from "src/transloco.config"

@Injectable({
    providedIn: "root",
})
export class I18nService {
    constructor(private transloco: TranslocoService) {}

    getActiveBrowserLang() {
        let activeLang = this.transloco.getActiveLang()
        if (!TranslocoConfigExt["browserLangs"].includes(activeLang)) {
            return TranslocoConfigExt["defaultBrowserLang"]
        }
        return activeLang
    }
}
