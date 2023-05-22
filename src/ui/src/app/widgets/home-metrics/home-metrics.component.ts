import { Component, Input } from "@angular/core"

@Component({
    selector: "app-home-metrics",
    templateUrl: "./home-metrics.component.html",
    styleUrls: ["./home-metrics.component.scss"],
})
export class HomeMetricsComponent {
    @Input() title?: string
    @Input() list?: string[] | null
}
