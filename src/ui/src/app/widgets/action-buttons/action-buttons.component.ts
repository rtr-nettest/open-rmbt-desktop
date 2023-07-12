import { Component, Input } from "@angular/core"
import { IMainMenuItem } from "src/app/interfaces/main-menu-item.interface"

@Component({
    selector: "app-action-buttons",
    templateUrl: "./action-buttons.component.html",
    styleUrls: ["./action-buttons.component.scss"],
})
export class ActionButtonsComponent {
    @Input() items?: IMainMenuItem[]
}
