import { Component } from "@angular/core"
import { SafeUrl } from "@angular/platform-browser"
import { Observable, of } from "rxjs"

@Component({
    selector: "app-social-buttons",
    templateUrl: "./social-buttons.component.html",
    styleUrls: ["./social-buttons.component.scss"],
    standalone: false,
})
export class SocialButtonsComponent {
    // Social sharing was only populated for the (removed) ONT flavor, which
    // sourced the regulator link from the CMS project. There are no share
    // buttons in this build.
    shareButtons$: Observable<{ className: string; url: string | SafeUrl }[]> =
        of([])
}
