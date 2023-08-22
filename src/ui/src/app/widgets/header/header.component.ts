import { ChangeDetectionStrategy, Component, Input } from "@angular/core"
import { ActivatedRoute, Router } from "@angular/router"
import { map } from "rxjs"
import { THIS_INTERRUPTS_ACTION } from "src/app/constants/strings"
import { ERoutes } from "src/app/enums/routes.enum"
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
            if (segments.join("/") === ERoutes.TEST) {
                return this.noGo
            }
            return "/"
        })
    )
    env$ = this.mainStore.env$

    constructor(
        private activeRoute: ActivatedRoute,
        private mainStore: MainStore,
        private message: MessageService,
        private router: Router
    ) {}

    handleClick(event: MouseEvent, link: string) {
        if (link === this.noGo) {
            event.stopPropagation()
            event.preventDefault()
            this.message.openConfirmDialog(
                THIS_INTERRUPTS_ACTION,
                () => {
                    window.electronAPI.abortMeasurement()
                    this.router.navigate(["/"])
                },
                { canCancel: true }
            )
        }
    }
}
