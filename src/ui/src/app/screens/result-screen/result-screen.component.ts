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

    constructor(private store: TestStore, private route: ActivatedRoute) {}

    getSpeedInMbps(speed: number) {
        return getSignificantDigits(speed / 1e6) + " Mbps"
    }

    getPingInMs(ping: number) {
        return getSignificantDigits(ping) + " ms"
    }
}
