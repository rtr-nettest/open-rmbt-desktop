import {
    Component,
    Input,
    NgZone,
    OnChanges,
    SimpleChanges,
} from "@angular/core"
import { ActivatedRoute, Router, UrlSegment } from "@angular/router"
import { TranslocoService } from "@ngneat/transloco"
import { combineLatest, map } from "rxjs"
import { THIS_INTERRUPTS_ACTION } from "src/app/constants/strings"
import { ERoutes } from "src/app/enums/routes.enum"
import { IMainMenuItem } from "src/app/interfaces/main-menu-item.interface"
import { CMSService } from "src/app/services/cms.service"
import { I18nService } from "src/app/services/i18n.service"
import { MessageService } from "src/app/services/message.service"
import { MainStore } from "src/app/store/main.store"
import { TestStore } from "src/app/store/test.store"

@Component({
    selector: "app-main-menu",
    templateUrl: "./main-menu.component.html",
    styleUrls: ["./main-menu.component.scss"],
})
export class MainMenuComponent implements OnChanges {
    @Input() disabled = false
    menu$ = this.buildMenu()
    settingsItem?: IMainMenuItem
    env$ = this.mainStore.env$

    constructor(
        private activeRoute: ActivatedRoute,
        private cmsService: CMSService,
        private i18n: I18nService,
        private testStore: TestStore,
        private mainStore: MainStore,
        private message: MessageService,
        private ngZone: NgZone,
        private router: Router,
        private transloco: TranslocoService
    ) {}

    ngOnChanges(changes: SimpleChanges): void {
        if ("disabled" in changes) {
            this.menu$ = this.buildMenu()
        }
    }

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

    private buildMenu() {
        return combineLatest([
            this.cmsService.getMenu(),
            this.activeRoute.url,
            this.transloco.selectTranslation(),
            this.mainStore.env$,
        ]).pipe(
            map(([menu, activeRoute, _, env]) => {
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
                                this.i18n.getActiveBrowserLang()
                            ),
                        }
                    } else if (mi.url?.includes("$os") && env?.OS) {
                        item = {
                            ...mi,
                            url: mi.url.replace("$os", env.OS),
                        }
                    }
                    return this.parseMenuItem(item, activeRoute)
                })
            })
        )
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
                if (item.url) {
                    window.open(item.url, "_blank")
                } else if (item.route) {
                    if (this.testStore.enableLoopMode$.value === true) {
                        window.electronAPI.abortMeasurement()
                        window.electronAPI.onMeasurementAborted(() => {
                            window.electronAPI.offMeasurementAborted()
                            this.ngZone.run(() => {
                                this.router.navigate([item.route])
                            })
                        })
                    } else {
                        this.router.navigate([item.route])
                    }
                }
            },
        }
    }
}
