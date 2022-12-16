import { Component } from "@angular/core"
import { ActivatedRoute } from "@angular/router"
import { getSignificantDigits } from "src/app/helpers/number"
import { TestStore } from "src/app/store/test.store"

@Component({
    selector: "app-result-screen",
    templateUrl: "./result-screen.component.html",
    styleUrls: ["./result-screen.component.scss"],
})
export class ResultScreenComponent {
    result$ = this.store.getMeasurementResult(
        this.route.snapshot.paramMap.get("testUuid")
    )
    error$ = this.store.error$

    constructor(private store: TestStore, private route: ActivatedRoute) {}

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
        return getSignificantDigits(speed / 1e3) + " Mbps"
    }

    getPingInMs(ping: number) {
        return getSignificantDigits(ping) + " ms"
    }
}
