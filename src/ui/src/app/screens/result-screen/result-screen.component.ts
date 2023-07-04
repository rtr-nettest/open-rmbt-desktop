import { ChangeDetectionStrategy, Component } from "@angular/core"
import { ActivatedRoute } from "@angular/router"
import { TranslocoService } from "@ngneat/transloco"
import { getSignificantDigits } from "src/app/helpers/number"
import { MainStore } from "src/app/store/main.store"
import { TestStore } from "src/app/store/test.store"

@Component({
    selector: "app-result-screen",
    templateUrl: "./result-screen.component.html",
    styleUrls: ["./result-screen.component.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResultScreenComponent {
    env$ = this.mainStore.env$
    error$ = this.mainStore.error$
    result$ = this.store.getMeasurementResult(
        this.route.snapshot.paramMap.get("testUuid")
    )

    constructor(
        private store: TestStore,
        private mainStore: MainStore,
        private route: ActivatedRoute,
        private transloco: TranslocoService
    ) {}

    getIconStyleByClass(classification: number) {
        switch (classification) {
            case 1:
                return ["app-icon--class", "app-icon--class-red"]
            case 2:
                return ["app-icon--class", "app-icon--class-yellow"]
            case 3:
                return ["app-icon--class", "app-icon--class-green"]
            case 4:
                return ["app-icon--class", "app-icon--class-greenest"]
            default:
                return ["app-icon--class"]
        }
    }

    getSpeedInMbps(speed: number) {
        return (
            getSignificantDigits(speed / 1e3) +
            " " +
            this.transloco.translate("Mbps")
        )
    }

    getPingInMs(ping: number) {
        return getSignificantDigits(ping) + " " + this.transloco.translate("ms")
    }
}
