import { Component, Input } from "@angular/core"
import { ActivatedRoute } from "@angular/router"
import { map, withLatestFrom } from "rxjs"
import { IMainMenuItem } from "src/app/interfaces/main-menu-item.interface"
import { CMSService } from "src/app/services/cms.service"
import { MessageService } from "src/app/services/message.service"

@Component({
    selector: "app-main-menu",
    templateUrl: "./main-menu.component.html",
    styleUrls: ["./main-menu.component.scss"],
})
export class MainMenuComponent {
    @Input() disabled = false
    menu$ = this.cmsService.getMenu().pipe(
        withLatestFrom(this.activeRoute.url),
        map(([menu, activeRoute]) => {
            return menu.map((item) => {
                return {
                    ...item,
                    route: this.disabled ? undefined : "/" + item.route,
                    className: [
                        this.disabled ? "app-menu-item--disabled" : "",
                        activeRoute.join("/") === item.route
                            ? "app-menu-item--active"
                            : "",
                    ].join(" "),
                }
            })
        })
    )

    constructor(
        private activeRoute: ActivatedRoute,
        private cmsService: CMSService,
        private message: MessageService
    ) {}

    handleClick(event: MouseEvent, item: IMainMenuItem) {
        if (!item.route) {
            event.stopPropagation()
            event.preventDefault()
            this.message.openSnackbar(
                "Navigation is impossible from this screen"
            )
        }
    }

    trackBy(index: number, item: any) {
        return item.label
    }
}
