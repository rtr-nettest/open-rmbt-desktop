import { ChangeDetectionStrategy, Component } from "@angular/core"
import { switchMap } from "rxjs"
import { CMSService } from "src/app/services/cms.service"
import { MainStore } from "src/app/store/main.store"

@Component({
    selector: "app-home-screen",
    templateUrl: "./home-screen.component.html",
    styleUrls: ["./home-screen.component.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeScreenComponent {
    env$ = this.mainStore.env$
    testInviteImg$ = this.mainStore.env$.pipe(
        switchMap((env) =>
            this.cmsService.getAssetByName(
                `test-invite-img.${env?.X_NETTEST_CLIENT}.svg`
            )
        )
    )

    constructor(private mainStore: MainStore, private cmsService: CMSService) {}
}
