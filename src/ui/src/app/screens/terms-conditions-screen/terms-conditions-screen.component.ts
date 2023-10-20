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
    timeSinceLoad = 0

    constructor(
        private router: Router,
        private cms: CMSService,
        private mainStore: MainStore
    ) {}

    ngOnInit(): void {
        this.waitForFullLoad().then(this.watchForScroll)
    }

    waitForFullLoad(): Promise<Element> {
        return new Promise((resolve) => {
            let body: Element | null
            const interval = setInterval(() => {
                this.timeSinceLoad += 300
                body = document.querySelector(".app-article>p:last-of-type")
                if (body || this.timeSinceLoad >= 2400) {
                    clearInterval(interval)
                    resolve(body || document.querySelector(".app-article")!)
                }
            }, 300)
        })
    }

    watchForScroll = (body: Element) => {
        const options = {
            root: document.querySelector(".app-wrapper"),
            rootMargin: "24px 20px",
        }
        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach((e) => {
                if (e.isIntersecting) {
                    this.isRead = true
                }
            })
        }, options)
        observer.observe(body)
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
