import { Component, Input } from "@angular/core"
import { ActivatedRoute, Router, UrlSegment } from "@angular/router"
import { TranslocoService } from "@ngneat/transloco"
import { combineLatest, map } from "rxjs"
import { THIS_INTERRUPTS_ACTION } from "src/app/constants/strings"
import { ERoutes } from "src/app/enums/routes.enum"
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
    menu$ = combineLatest([
        this.cmsService.getMenu(),
        this.activeRoute.url,
        this.transloco.selectTranslation(),
    ]).pipe(
        map(([menu, activeRoute]) => {
            this.settingsItem = this.parseMenuItem(
                {
                    label: "Options",
                    translations: [],
                    route: ERoutes.SETTINGS,
                    icon: "settings",
                },
                activeRoute
            )
            return menu.map((mi) => {
                let item = mi
                if (mi.url?.includes("$lang")) {
                    item = {
                        ...mi,
                        url: mi.url.replace(
                            "$lang",
                            this.transloco.getActiveLang()
                        ),
                    }
                }
                return this.parseMenuItem(item, activeRoute)
            })
        })
    )
    settingsItem?: IMainMenuItem

    constructor(
        private activeRoute: ActivatedRoute,
        private cmsService: CMSService,
        private message: MessageService,
        private router: Router,
        private transloco: TranslocoService
    ) {}

    handleClick(event: MouseEvent, item: IMainMenuItem) {
        if (!item.route) {
            event.stopPropagation()
            event.preventDefault()
            if (!item.className?.includes("app-menu-item--active"))
                this.message.openConfirmDialog(
                    THIS_INTERRUPTS_ACTION,
                    () => {
                        item.action?.(event)
                    },
                    { canCancel: true }
                )
        }
    }

    trackBy(index: number, item: any) {
        return item.label
    }

    private parseMenuItem = (
        item: IMainMenuItem,
        activeRoute: UrlSegment[]
    ) => {
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
                if (item.url) {
                    window.open(item.url, "_blank")
                } else if (item.route) {
                    this.router.navigate([item.route])
                }
            },
        }
    }
}
