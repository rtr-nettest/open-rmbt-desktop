import { Component, Input, ChangeDetectionStrategy } from "@angular/core"
import { arrowRotate } from "src/app/animations/arrow-rotate.animation"

@Component({
    animations: [arrowRotate],
    selector: "app-expand-arrow",
    templateUrl: "./expand-arrow.component.html",
    styleUrls: ["./expand-arrow.component.scss"],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false,
})
export class ExpandArrowComponent {
    @Input() parameters?: { expanded: boolean }
}
