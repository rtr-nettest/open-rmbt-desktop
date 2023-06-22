import {
    ChangeDetectionStrategy,
    Component,
    OnDestroy,
    OnInit,
} from "@angular/core"
import { Router } from "@angular/router"
import { TranslocoService } from "@ngneat/transloco"
import {
    Subject,
    distinctUntilChanged,
    from,
    map,
    switchMap,
    takeUntil,
    tap,
    withLatestFrom,
} from "rxjs"
import { TERMS_AND_CONDITIONS, UNKNOWN } from "src/app/constants/strings"
import { ERoutes } from "src/app/enums/routes.enum"
import { CMSService } from "src/app/services/cms.service"
import { MessageService } from "src/app/services/message.service"
import { MainStore } from "src/app/store/main.store"

@Component({
    selector: "app-home-screen",
    templateUrl: "./home-screen.component.html",
    styleUrls: ["./home-screen.component.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeScreenComponent implements OnDestroy, OnInit {
    destroyed$ = new Subject<void>()
    env$ = this.mainStore.env$
    error$ = this.mainStore.error$
        .pipe(
            distinctUntilChanged(),
            takeUntil(this.destroyed$),
            tap((error) => {
                if (error) {
                    this.message.openSnackbar(error.message)
                }
            })
        )
        .subscribe()
    ipInfo$ = this.mainStore.settings$.pipe(
        map((settings) => {
            if (settings?.ipInfo) {
                const { publicV4, publicV6, privateV4, privateV6 } =
                    settings?.ipInfo
                return [
                    `IPv4:&nbsp;${this.getIPIcon(
                        publicV4,
                        privateV4
                    )}&nbsp;${publicV4}`,
                    `IPv6:&nbsp;${this.getIPIcon(
                        publicV6,
                        privateV6
                    )}&nbsp;${publicV6}`,
                ]
            }
            return [
                `IPv4:&nbsp;${this.getIPIcon(UNKNOWN, UNKNOWN)}`,
                `IPv6:&nbsp;${this.getIPIcon(UNKNOWN, UNKNOWN)}`,
            ]
        })
    )
    testInviteImg$ = this.mainStore.env$.pipe(
        switchMap((env) =>
            this.cmsService.getAssetByName(
                `test-invite-img.${env?.X_NETTEST_CLIENT}.svg`
            )
        )
    )
    terms$ = this.transloco
        .selectTranslate(TERMS_AND_CONDITIONS)
        .pipe(
            takeUntil(this.destroyed$),
            withLatestFrom(from(window.electronAPI.getTermsAccepted())),
            tap(([terms, acceptedTerms]) => {
                if (terms !== acceptedTerms) {
                    this.router.navigate(["/", ERoutes.TERMS_CONDITIONS])
                } else {
                    this.showProgress = false
                }
            })
        )
        .subscribe()
    showProgress = true

    constructor(
        private mainStore: MainStore,
        private cmsService: CMSService,
        private message: MessageService,
        private router: Router,
        private transloco: TranslocoService
    ) {}

    ngOnInit(): void {
        this.mainStore.registerClient()
    }

    ngOnDestroy(): void {
        this.destroyed$.next()
        this.destroyed$.complete()
    }

    getIPIcon(publicAddress: string, privateAddress: string) {
        if (publicAddress === UNKNOWN) {
            return '<i class="app-icon--class app-icon--class-gray"></i>'
        } else if (!publicAddress) {
            return '<i class="app-icon--class app-icon--class-red"></i>'
        } else if (publicAddress !== privateAddress) {
            return '<i class="app-icon--class app-icon--class-yellow"></i>'
        } else {
            return '<i class="app-icon--class app-icon--class-green"></i>'
        }
    }
}
