import { Component } from "@angular/core"
import { Router } from "@angular/router"

@Component({
    selector: "app-terms-conditions-screen",
    templateUrl: "./terms-conditions-screen.component.html",
    styleUrls: ["./terms-conditions-screen.component.scss"],
})
export class TermsConditionsScreenComponent {
    constructor(private router: Router) {}

    cancel() {
        window.electronAPI.quit()
    }

    agree() {
        window.electronAPI.acceptTerms()
        this.router.navigateByUrl("/")
    }
}
