import { Component, Input, Output, EventEmitter } from "@angular/core"
import { IMainMenuItem } from "../../interfaces/main-menu-item.interface"
import { MainStore } from "src/app/store/main.store"

@Component({
    selector: "app-main-menu-item",
    templateUrl: "./main-menu-item.component.html",
    styleUrls: ["./main-menu-item.component.scss"],
})
export class MainMenuItemComponent {
    @Input() item?: IMainMenuItem

    @Output() menuClick: EventEmitter<MouseEvent> = new EventEmitter()

    env$ = this.mainStore.env$

    constructor(private mainStore: MainStore) {}
}
