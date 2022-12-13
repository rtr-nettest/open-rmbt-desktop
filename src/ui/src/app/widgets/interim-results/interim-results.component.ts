import { Component } from "@angular/core"
import { tap } from "rxjs"
import { getSignificantDigits } from "src/app/helpers/number"
import { TestStore } from "src/app/store/test.store"
import { EMeasurementStatus } from "../../../../../measurement/enums/measurement-status.enum"

@Component({
    selector: "app-interim-results",
    templateUrl: "./interim-results.component.html",
    styleUrls: ["./interim-results.component.scss"],
})
export class InterimResultsComponent {
    visualization$ = this.store.visualization$.pipe(
        tap((state) => {
            this.ping = getSignificantDigits(
                state.phases[EMeasurementStatus.DOWN].ping
            )
            this.download = getSignificantDigits(
                state.phases[EMeasurementStatus.DOWN].down
            )
            this.upload = getSignificantDigits(
                state.phases[EMeasurementStatus.UP].up
            )
        })
    )
    basicNetworkInfo$ = this.store.basicNetworkInfo$.pipe(
        tap((state) => {
            this.serverName = state.serverName
            this.ipAddress = state.ipAddress
            this.providerName = state.providerName
        })
    )

    ping: number = -1
    download: number = -1
    upload: number = -1

    serverName: string = "-"
    ipAddress: string = "-"
    providerName: string = "-"

    constructor(private store: TestStore) {}
}
