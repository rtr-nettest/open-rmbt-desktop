import { Component, Input } from "@angular/core"

@Component({
    selector: "app-alert",
    templateUrl: "./alert.component.html",
    styleUrls: ["./alert.component.scss"],
    standalone: false
})
export class AlertComponent {
    @Input() text?: string
    @Input() kind: "info" | "warning" = "info"
}
