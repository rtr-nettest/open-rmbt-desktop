import { ChangeDetectionStrategy, Component } from "@angular/core"
import { ActivatedRoute, Router } from "@angular/router"
import { map } from "rxjs"
import { THIS_INTERRUPTS_ACTION } from "src/app/constants/strings"
import { ERoutes } from "src/app/enums/routes.enum"
import { MessageService } from "src/app/services/message.service"

@Component({
    selector: "app-header",
    templateUrl: "./header.component.html",
    styleUrls: ["./header.component.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
    private noGo = "javascript:;"
    link$ = this.activeRoute.url.pipe(
        map((segments) => {
            if (segments.join("/") === ERoutes.TEST) {
                return this.noGo
            }
            return "/"
        })
    )

    constructor(
        private activeRoute: ActivatedRoute,
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
