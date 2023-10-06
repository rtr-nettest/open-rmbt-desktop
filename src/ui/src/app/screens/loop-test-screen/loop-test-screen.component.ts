import { Component } from "@angular/core"
import { TestScreenComponent } from "../test-screen/test-screen.component"

@Component({
    selector: "app-loop-test-screen",
    templateUrl: "../test-screen/test-screen.component.html",
    styleUrls: ["../test-screen/test-screen.component.scss"],
})
export class LoopTestScreenComponent extends TestScreenComponent {}
