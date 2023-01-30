import { ChangeDetectionStrategy, Component } from "@angular/core"
import { tap } from "rxjs"
import { getSignificantDigits } from "src/app/helpers/number"
import { TestStore } from "src/app/store/test.store"
import { EMeasurementStatus } from "../../../../../measurement/enums/measurement-status.enum"

@Component({
    selector: "app-interim-results",
    templateUrl: "./interim-results.component.html",
    styleUrls: ["./interim-results.component.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterimResultsComponent {
    visualization$ = this.store.visualization$.pipe(
        tap((state) => {
            const ping = getSignificantDigits(
                state.phases[EMeasurementStatus.DOWN].ping
            )
            this.ping = ping < 0 ? "-" : ping + " ms"
            const download = getSignificantDigits(
                state.phases[EMeasurementStatus.DOWN].down
            )
            this.download = download < 0 ? "-" : download + " Mbps"
            const upload = getSignificantDigits(
                state.phases[EMeasurementStatus.UP].up
            )
            this.upload = upload < 0 ? "-" : upload + " Mbps"
        })
    )
    basicNetworkInfo$ = this.store.basicNetworkInfo$.pipe(
        tap((state) => {
            this.serverName = state.serverName
            this.ipAddress = state.ipAddress
            this.providerName = state.providerName
        })
    )

    ping: string = "-"
    download: string = "-"
    upload: string = "-"

    serverName: string = "-"
    ipAddress: string = "-"
    providerName: string = "-"

    constructor(private store: TestStore) {}
}
