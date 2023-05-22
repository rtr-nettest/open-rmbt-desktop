import { Component } from "@angular/core"
import { CMSService } from "src/app/services/cms.service"

@Component({
    selector: "app-main-menu",
    templateUrl: "./main-menu.component.html",
    styleUrls: ["./main-menu.component.scss"],
})
export class MainMenuComponent {
    menu$ = this.cmsService.getMenu()

    constructor(private cmsService: CMSService) {}

    trackBy(index: number, item: any) {
        return item.label
    }
}
