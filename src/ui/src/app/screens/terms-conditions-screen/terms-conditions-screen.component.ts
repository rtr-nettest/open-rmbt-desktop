import { AfterViewInit, Component } from "@angular/core"
import { Router } from "@angular/router"
import { timer } from "rxjs"

@Component({
    selector: "app-terms-conditions-screen",
    templateUrl: "./terms-conditions-screen.component.html",
    styleUrls: ["./terms-conditions-screen.component.scss"],
})
export class TermsConditionsScreenComponent implements AfterViewInit {
    isRead = false

    constructor(private router: Router) {}

    ngAfterViewInit(): void {
        setTimeout(() => {
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
            const body = document.querySelector(".app-article>p:last-of-type")
            if (body) observer.observe(body)
        }, 300)
    }

    cancel() {
        window.electronAPI.quit()
    }

    agree() {
        window.electronAPI.acceptTerms()
        this.router.navigateByUrl("/")
    }
}
