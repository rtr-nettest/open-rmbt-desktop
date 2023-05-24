import { Component, Input } from "@angular/core"
import { ActivatedRoute } from "@angular/router"
import { map, withLatestFrom } from "rxjs"
import { IMainMenuItem } from "src/app/interfaces/main-menu-item.interface"
import { CMSService } from "src/app/services/cms.service"

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
        private cmsService: CMSService,
        private activeRoute: ActivatedRoute
    ) {}

    handleClick(event: MouseEvent, item: IMainMenuItem) {
        if (!item.route) {
            console.log("DISABLED")
            event.stopPropagation()
            event.preventDefault
            return false
        }
        return true
    }

    trackBy(index: number, item: any) {
        return item.label
    }
}
