import { ChangeDetectionStrategy, Component, Input } from "@angular/core"
import { ActivatedRoute, Router } from "@angular/router"
import { TranslocoService } from "@ngneat/transloco"
import { combineLatest, map } from "rxjs"
import { THIS_INTERRUPTS_ACTION } from "src/app/constants/strings"
import { ERoutes } from "src/app/enums/routes.enum"
import { MessageService } from "src/app/services/message.service"
import { MainStore } from "src/app/store/main.store"
import { TestStore } from "src/app/store/test.store"

@Component({
    selector: "app-header",
    templateUrl: "./header.component.html",
    styleUrls: ["./header.component.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class HeaderComponent {
    @Input() fixed = false
    @Input() hideMenu = false
    @Input() hideLoopModeAlert = false
    private noGo = "javascript:;"
    link$ = combineLatest([
        this.activeRoute.url,
        this.testStore.isCertifiedMeasurement$,
    ]).pipe(
        map(([segments, isCertifiedMeasurement]) => {
            if (
                segments.join("/") === ERoutes.TEST ||
                segments.join("/") === ERoutes.LOOP_TEST ||
                isCertifiedMeasurement
            ) {
                return this.noGo
            }
            return "/"
        }),
    )
    env$ = this.mainStore.env$
    isLoopModeTestScreen$ = combineLatest([
        this.testStore.enableLoopMode$,
        this.testStore.isCertifiedMeasurement$,
    ]).pipe(
        map(([loopMode, certifiedMeasurement]) => {
            return !!loopMode && !certifiedMeasurement
        }),
    )
    constructor(
        private activeRoute: ActivatedRoute,
        private mainStore: MainStore,
        private testStore: TestStore,
        private message: MessageService,
        private router: Router,
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
                { canCancel: true },
            )
        }
    }
}
