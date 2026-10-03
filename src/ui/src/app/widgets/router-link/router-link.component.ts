import { Component, Input, ChangeDetectionStrategy } from "@angular/core"

@Component({
    selector: "app-router-link",
    templateUrl: "./router-link.component.html",
    styleUrls: ["./router-link.component.scss"],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false,
})
export class RouterLinkComponent {
    @Input() parameters?: {
        route: string
        label: string
    }
}
