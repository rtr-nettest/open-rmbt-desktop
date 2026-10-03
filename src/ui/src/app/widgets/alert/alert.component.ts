import { Component, Input, ChangeDetectionStrategy } from "@angular/core"

@Component({
    selector: "app-alert",
    templateUrl: "./alert.component.html",
    styleUrls: ["./alert.component.scss"],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false,
})
export class AlertComponent {
    @Input() text?: string
    @Input() kind: "info" | "warning" = "info"
}
