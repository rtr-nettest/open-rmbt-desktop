import { Component, ChangeDetectionStrategy } from "@angular/core"

@Component({
    selector: "app-main-content",
    templateUrl: "./main-content.component.html",
    styleUrls: ["./main-content.component.scss"],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false,
})
export class MainContentComponent {}
