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
    link$ = this.activeRoute.url.pipe(
        map((segments) => {
            if (segments.join("/") === ERoutes.TEST) {
                return null
            }
            return "/"
        })
    )

    constructor(
        private activeRoute: ActivatedRoute,
        private message: MessageService
    ) {}

    handleClick(event: MouseEvent) {
        const link = event.target as HTMLAnchorElement
        if (!link.href) {
            event.stopPropagation()
            event.preventDefault()
            this.message.openSnackbar(
                "Navigation is impossible from this screen"
            )
        }
    }
}
