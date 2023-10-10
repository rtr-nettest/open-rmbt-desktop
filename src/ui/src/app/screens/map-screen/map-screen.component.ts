import { Component } from "@angular/core"
import { DomSanitizer } from "@angular/platform-browser"
import { map } from "rxjs"
import { I18nService } from "src/app/services/i18n.service"
import { MainStore } from "src/app/store/main.store"

@Component({
    selector: "app-map-screen",
    templateUrl: "./map-screen.component.html",
    styleUrls: ["./map-screen.component.scss"],
})
export class MapScreenComponent {
    mapLink$ = this.mainStore.env$.pipe(
        map((env) =>
            env?.FLAVOR !== "ont"
                ? this.sanitizer.bypassSecurityTrustResourceUrl(
                      env?.FULL_MAP_URL?.replace(
                          "$lang",
                          this.i18n.getActiveBrowserLang()
                      ) ?? ""
                  )
                : null
        )
    )

    constructor(
        private mainStore: MainStore,
        private sanitizer: DomSanitizer,
        private i18n: I18nService
    ) {}
}
