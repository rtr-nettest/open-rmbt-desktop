import { Component, OnInit } from "@angular/core"
import { Router } from "@angular/router"
import { TranslocoService } from "@ngneat/transloco"
import { TERMS_AND_CONDITIONS } from "src/app/constants/strings"

@Component({
    selector: "app-terms-conditions-screen",
    templateUrl: "./terms-conditions-screen.component.html",
    styleUrls: ["./terms-conditions-screen.component.scss"],
})
export class TermsConditionsScreenComponent implements OnInit {
    isRead = false
    timeSinceLoad = 0

    constructor(private router: Router, private transloco: TranslocoService) {}

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
        window.electronAPI.acceptTerms(
            this.transloco.translate(TERMS_AND_CONDITIONS)
        )
        this.router.navigateByUrl("/")
    }
}
