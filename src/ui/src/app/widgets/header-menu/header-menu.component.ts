import { Component, ChangeDetectionStrategy } from "@angular/core"
import { MainMenuComponent } from "../main-menu/main-menu.component"

@Component({
    selector: "app-header-menu",
    templateUrl: "./header-menu.component.html",
    styleUrls: ["./header-menu.component.scss"],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false,
})
export class HeaderMenuComponent extends MainMenuComponent {}
