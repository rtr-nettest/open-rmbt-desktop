import { Component, Input } from "@angular/core"

@Component({
    selector: "app-router-link",
    templateUrl: "./router-link.component.html",
    styleUrls: ["./router-link.component.scss"],
})
export class RouterLinkComponent {
    @Input() parameters?: {
        route: string
        label: string
    }
}
