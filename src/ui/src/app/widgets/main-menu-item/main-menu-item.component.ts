import { Component, Input, Output, EventEmitter } from "@angular/core"
import { IMainMenuItem } from "../../interfaces/main-menu-item.interface"

@Component({
    selector: "app-main-menu-item",
    templateUrl: "./main-menu-item.component.html",
    styleUrls: ["./main-menu-item.component.scss"],
})
export class MainMenuItemComponent {
    @Input() item?: IMainMenuItem

    @Output() menuClick: EventEmitter<MouseEvent> = new EventEmitter()
}
