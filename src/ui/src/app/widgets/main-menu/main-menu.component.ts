import { Component, Input } from "@angular/core"
import { ActivatedRoute, Router } from "@angular/router"
import { map, withLatestFrom } from "rxjs"
import { THIS_INTERRUPTS_ACTION } from "src/app/constants/strings"
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
                    action: () => {
                        window.electronAPI.abortMeasurement()
                        this.router.navigate([item.route])
                    },
                }
            })
        })
    )

    constructor(
        private activeRoute: ActivatedRoute,
        private cmsService: CMSService,
        private message: MessageService,
        private router: Router
    ) {}

    handleClick(event: MouseEvent, item: IMainMenuItem) {
        if (!item.route) {
            event.stopPropagation()
            event.preventDefault()
            if (!item.className?.includes("app-menu-item--active"))
                this.message.openConfirmDialog(THIS_INTERRUPTS_ACTION, () => {
                    item.action?.(event)
                })
        }
    }

    trackBy(index: number, item: any) {
        return item.label
    }
}
