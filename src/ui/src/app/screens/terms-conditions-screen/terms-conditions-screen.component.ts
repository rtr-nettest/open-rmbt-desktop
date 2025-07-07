import { Component, OnInit } from "@angular/core"
import { Router } from "@angular/router"
import { of, switchMap, withLatestFrom } from "rxjs"
import { CMSService } from "src/app/services/cms.service"
import { MainStore } from "src/app/store/main.store"

@Component({
    selector: "app-terms-conditions-screen",
    templateUrl: "./terms-conditions-screen.component.html",
    styleUrls: ["./terms-conditions-screen.component.scss"],
})
export class TermsConditionsScreenComponent implements OnInit {
    terms$ = this.mainStore.settings$.pipe(
        withLatestFrom(this.mainStore.env$),
        switchMap(([settings, env]) => {
            this.termsText = settings?.termsText || ""
            return env?.FLAVOR === "ont" ? this.cms.getTerms() : of(null)
        })
    )
    isRead = false
    termsText = ""

    constructor(
        private router: Router,
        private cms: CMSService,
        private mainStore: MainStore
    ) {}

    ngOnInit(): void {
        this.watchForScroll()
    }

    watchForScroll = () => {
        const interval = setInterval(() => {
            const viewportHeight =
                document.querySelector(".app-wrapper")?.getBoundingClientRect()
                    .height || 0
            const articleHeight =
                (document.querySelector(".app-article")?.getBoundingClientRect()
                    .height || 0) - viewportHeight
            const articleY =
                document.querySelector(".app-article")?.getBoundingClientRect()
                    .y || 0
            if (Math.abs(articleY) > articleHeight) {
                this.isRead = true
                clearInterval(interval)
            }
        }, 300)
    }

    cancel() {
        window.electronAPI.quit()
    }

    agree() {
        let termsVersion = 0
        if (this.mainStore.settings$.value?.terms_and_conditions.version) {
            termsVersion =
                this.mainStore.settings$.value.terms_and_conditions.version
        } else if (this.mainStore.terms$.value?.version) {
            termsVersion = this.mainStore.terms$.value.version
        }
        window.electronAPI.acceptTerms(termsVersion)
        this.router.navigateByUrl("/")
    }
}
