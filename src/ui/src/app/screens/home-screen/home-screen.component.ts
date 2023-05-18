import { ChangeDetectionStrategy, Component, OnDestroy } from "@angular/core"
import { MatSnackBar } from "@angular/material/snack-bar"
import { Subject, distinctUntilChanged, switchMap, takeUntil, tap } from "rxjs"
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
}
