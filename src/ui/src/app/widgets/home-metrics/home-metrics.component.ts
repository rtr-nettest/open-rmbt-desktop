import { Component, Input, ChangeDetectionStrategy } from "@angular/core"

@Component({
    selector: "app-home-metrics",
    templateUrl: "./home-metrics.component.html",
    styleUrls: ["./home-metrics.component.scss"],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false,
})
export class HomeMetricsComponent {
    @Input() title?: string
    @Input() list?: string[] | null
}
