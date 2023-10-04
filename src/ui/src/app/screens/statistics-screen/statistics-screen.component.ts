import { Component } from "@angular/core"
import { DomSanitizer } from "@angular/platform-browser"
import { TranslocoService } from "@ngneat/transloco"
import { map } from "rxjs"
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
                          this.transloco.getActiveLang()
                      ) ?? ""
                  )
                : null
        )
    )

    constructor(
        private mainStore: MainStore,
        private sanitizer: DomSanitizer,
        private transloco: TranslocoService
    ) {}
}
