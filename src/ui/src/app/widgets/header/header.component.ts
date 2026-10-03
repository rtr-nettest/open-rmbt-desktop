import { ChangeDetectionStrategy, Component, Input } from "@angular/core"
import { ActivatedRoute, Router } from "@angular/router"
import { I18nService } from "src/app/services/i18n.service"
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
    // Loop-header text. A normal loop names when it will end (loop start +
    // LOOP_MODE_MAX_DURATION); otherwise the plain "until stopped" hint.
    loopModeAlertText$ = combineLatest([
        this.transloco.selectTranslation(),
        this.testStore.enableLoopMode$,
        this.testStore.isCertifiedMeasurement$,
        this.mainStore.env$,
    ]).pipe(
        map(([t]) => {
            const endMs = this.testStore.loopModeEndTime()
            if (!endMs) {
                return t[
                    "Tests are conducted repeatedly until they are stopped manually"
                ]
            }
            const end = new Date(endMs).toLocaleString(
                this.transloco.getActiveLang(),
                {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                },
            )
            const template =
                t["Tests are conducted repeatedly until %0 or until stopped"] ??
                "Tests are conducted repeatedly until %0 or until stopped"
            return template.replace("%0", end)
        }),
    )
    constructor(
        private activeRoute: ActivatedRoute,
        private mainStore: MainStore,
        private testStore: TestStore,
        private message: MessageService,
        private router: Router,
        private transloco: I18nService,
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
