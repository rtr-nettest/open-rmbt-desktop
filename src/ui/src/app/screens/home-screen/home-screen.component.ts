import { ChangeDetectionStrategy, Component, OnDestroy } from "@angular/core"
import { MatSnackBar } from "@angular/material/snack-bar"
import {
    Subject,
    distinctUntilChanged,
    map,
    switchMap,
    takeUntil,
    tap,
} from "rxjs"
import { UNKNOWN } from "src/app/constants/misc"
import { CMSService } from "src/app/services/cms.service"
import { MainStore } from "src/app/store/main.store"

@Component({
    selector: "app-home-screen",
    templateUrl: "./home-screen.component.html",
    styleUrls: ["./home-screen.component.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeScreenComponent implements OnDestroy {
    destroyed$ = new Subject<void>()
    env$ = this.mainStore.env$
    error$ = this.mainStore.error$
        .pipe(
            distinctUntilChanged(),
            takeUntil(this.destroyed$),
            tap((error) => {
                if (error) {
                    this.snackbar.open(error.message, undefined, {
                        duration: 3000,
                    })
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

    constructor(
        private mainStore: MainStore,
        private cmsService: CMSService,
        private snackbar: MatSnackBar
    ) {}

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
