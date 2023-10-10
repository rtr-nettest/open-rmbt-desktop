import { Component } from "@angular/core"
import { DomSanitizer } from "@angular/platform-browser"
import { map } from "rxjs"
import { I18nService } from "src/app/services/i18n.service"
import { MainStore } from "src/app/store/main.store"

@Component({
    selector: "app-statistics-screen",
    templateUrl: "./statistics-screen.component.html",
    styleUrls: ["./statistics-screen.component.scss"],
})
export class StatisticsScreenComponent {
    statisticsLink$ = this.mainStore.env$.pipe(
        map((env) =>
            env?.FLAVOR !== "ont"
                ? this.sanitizer.bypassSecurityTrustResourceUrl(
                      env?.FULL_STATISTICS_URL?.replace(
                          "$lang",
                          this.i18n.getActiveBrowserLang()
                      ) ?? ""
                  )
                : null
        )
    )

    constructor(
        private i18n: I18nService,
        private mainStore: MainStore,
        private sanitizer: DomSanitizer
    ) {}
}
