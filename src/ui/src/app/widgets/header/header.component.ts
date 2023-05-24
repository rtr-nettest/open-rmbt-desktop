import { ChangeDetectionStrategy, Component } from "@angular/core"
import { ActivatedRoute } from "@angular/router"
import { map } from "rxjs"
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
        private message: MessageService
    ) {}

    handleClick(event: MouseEvent, link: string) {
        if (link === this.noGo) {
            event.stopPropagation()
            event.preventDefault()
            this.message.openSnackbar(
                "Navigation is impossible from this screen"
            )
        }
    }
}
