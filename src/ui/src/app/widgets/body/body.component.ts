import { Component, ChangeDetectionStrategy } from "@angular/core"

@Component({
    selector: "app-body",
    templateUrl: "./body.component.html",
    styleUrls: ["./body.component.scss"],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false,
})
export class BodyComponent {}
