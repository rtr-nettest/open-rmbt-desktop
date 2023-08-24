import { Component } from "@angular/core"
import { MainMenuComponent } from "../main-menu/main-menu.component"

@Component({
    selector: "app-header-menu",
    templateUrl: "./header-menu.component.html",
    styleUrls: ["./header-menu.component.scss"],
})
export class HeaderMenuComponent extends MainMenuComponent {}
