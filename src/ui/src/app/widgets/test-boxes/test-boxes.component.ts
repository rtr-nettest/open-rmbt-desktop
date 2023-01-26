import { Component } from "@angular/core"
import { tap } from "rxjs"
import { ITestItemState } from "src/app/interfaces/test-item-state.interface"
import { ITestVisualizationState } from "src/app/interfaces/test-visualization-state.interface"
import { TestStore } from "src/app/store/test.store"
import { EMeasurementStatus } from "../../../../../measurement/enums/measurement-status.enum"

@Component({
    selector: "app-test-boxes",
    templateUrl: "./test-boxes.component.html",
    styleUrls: ["./test-boxes.component.scss"],
})
export class TestBoxesComponent {
    visualization$ = this.store.visualization$.pipe(
        tap((visualization) => {
            this.ping = visualization.phases[EMeasurementStatus.PING]
            this.download = visualization.phases[EMeasurementStatus.DOWN]
            this.upload = visualization.phases[EMeasurementStatus.UP]
        })
    )
    basicNetworkInfo$ = this.store.basicNetworkInfo$.pipe(
        tap((state) => {
            this.serverName = state.serverName
            this.ipAddress = state.ipAddress
            this.providerName = state.providerName
        })
    )

    ping: ITestItemState | undefined
    download: ITestItemState | undefined
    upload: ITestItemState | undefined

    serverName: string = "-"
    ipAddress: string = "-"
    providerName: string = "-"

    constructor(private store: TestStore) {}
}
