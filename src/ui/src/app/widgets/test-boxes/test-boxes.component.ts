import { ChangeDetectionStrategy, Component } from "@angular/core"
import { tap } from "rxjs"
import { ITestPhaseState } from "src/app/interfaces/test-phase-state.interface"
import { TestStore } from "src/app/store/test.store"
import { EMeasurementStatus } from "../../../../../measurement/enums/measurement-status.enum"

@Component({
    selector: "app-test-boxes",
    templateUrl: "./test-boxes.component.html",
    styleUrls: ["./test-boxes.component.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TestBoxesComponent {
    visualization$ = this.store.visualization$.pipe(
        tap((visualization) => {
            this.ping = visualization.phases[EMeasurementStatus.PING]
            this.download = visualization.phases[EMeasurementStatus.DOWN]
            this.upload = visualization.phases[EMeasurementStatus.UP]
            this.isShowingResult =
                visualization.currentPhaseName ===
                EMeasurementStatus.SHOWING_RESULTS
        })
    )
    basicNetworkInfo$ = this.store.basicNetworkInfo$.pipe(
        tap((state) => {
            this.serverName = state.serverName
            this.ipAddress = state.ipAddress
            this.providerName = state.providerName
        })
    )

    isShowingResult = false

    ping: ITestPhaseState | undefined
    download: ITestPhaseState | undefined
    upload: ITestPhaseState | undefined

    serverName: string = "-"
    ipAddress: string = "-"
    providerName: string = "-"

    constructor(private store: TestStore) {}
}
