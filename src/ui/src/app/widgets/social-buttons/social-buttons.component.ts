import { Component, Input } from "@angular/core"
import { DomSanitizer, SafeUrl } from "@angular/platform-browser"
import { TranslocoService } from "@ngneat/transloco"
import { Observable, combineLatest, map, withLatestFrom } from "rxjs"
import { CMSService } from "src/app/services/cms.service"
import { MainStore } from "src/app/store/main.store"
import { TestStore } from "src/app/store/test.store"

@Component({
    selector: "app-social-buttons",
    templateUrl: "./social-buttons.component.html",
    styleUrls: ["./social-buttons.component.scss"],
})
export class SocialButtonsComponent {
    shareButtons$: Observable<{ className: string; url: string | SafeUrl }[]> =
        combineLatest([
            this.testStore.simpleHistoryResult$,
            this.transloco.selectTranslation(),
            this.cms.getProject(),
        ]).pipe(
            map(([result, t, project]) => {
                if (!result || !t || !project) {
                    return []
                }
                const pageTitle = t["Sharing title"]
                const pageUrl = `${project.regulator_link}${t["Sharing path"]}${result.testUuid}`
                return [
                    {
                        className: "twitter",
                        url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(
                            pageTitle
                        )}&url=${encodeURIComponent(pageUrl)}`,
                    },
                    {
                        className: "facebook",
                        url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
                            pageUrl
                        )}`,
                    },
                    {
                        className: "linkedin",
                        url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
                            pageUrl
                        )}`,
                    },
                    {
                        className: "whatsapp",
                        url: this.sanitizer.bypassSecurityTrustUrl(
                            `https://wa.me/?text=${encodeURIComponent(
                                pageTitle
                            )}%20${encodeURIComponent(pageUrl)}`
                        ),
                    },
                ]
            })
        )

    constructor(
        private cms: CMSService,
        private testStore: TestStore,
        private transloco: TranslocoService,
        private sanitizer: DomSanitizer
    ) {}
}
