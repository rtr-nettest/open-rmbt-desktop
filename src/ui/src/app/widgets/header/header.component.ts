import { ChangeDetectionStrategy, Component, Input } from "@angular/core"
import { ActivatedRoute, Router } from "@angular/router"
import { TranslocoService } from "@ngneat/transloco"
import { concatMap, map, of } from "rxjs"
import { THIS_INTERRUPTS_ACTION } from "src/app/constants/strings"
import { ERoutes } from "src/app/enums/routes.enum"
import { CMSService } from "src/app/services/cms.service"
import { MessageService } from "src/app/services/message.service"
import { MainStore } from "src/app/store/main.store"

@Component({
    selector: "app-header",
    templateUrl: "./header.component.html",
    styleUrls: ["./header.component.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
    @Input() fixed = false
    @Input() hideMenu = false
    private noGo = "javascript:;"
    link$ = this.activeRoute.url.pipe(
        map((segments) => {
            if (
                segments.join("/") === ERoutes.TEST ||
                segments.join("/") === ERoutes.LOOP_TEST
            ) {
                return this.noGo
            }
            return "/"
        })
    )
    env$ = this.mainStore.env$
    ontLogo$ = this.mainStore.env$.pipe(
        concatMap((env) =>
            this.cms.getAssetByName(
                `logo-header.${
                    env?.X_NETTEST_CLIENT
                }.${this.transloco.getActiveLang()}.svg`
            )
        ),
        concatMap((asset) =>
            asset
                ? of(asset)
                : this.cms.getAssetByName(
                      `logo-header.${
                          this.mainStore.env$.value?.X_NETTEST_CLIENT
                      }.${this.transloco.getDefaultLang()}.svg`
                  )
        ),
        map((asset) => asset?.url || "/assets/images/logo-header.svg")
    )

    constructor(
        private activeRoute: ActivatedRoute,
        private cms: CMSService,
        private mainStore: MainStore,
        private message: MessageService,
        private router: Router,
        private transloco: TranslocoService
    ) {}

    handleClick(event: MouseEvent, link: string) {
        if (link === this.noGo) {
            event.stopPropagation()
            event.preventDefault()
            this.message.openConfirmDialog(
                THIS_INTERRUPTS_ACTION,
                () => {
                    this.router.navigate(["/"])
                },
                { canCancel: true }
            )
        }
    }
}
