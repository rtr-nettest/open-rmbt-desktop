import { Component } from "@angular/core"
import { ITestVisualizationState } from "src/app/interfaces/test-visualization-state.interface"
import { TestStore } from "src/app/store/test.store"
import { EMeasurementStatus } from "../../../../../measurement/enums/measurement-status.enum"

@Component({
    selector: "app-test-charts",
    templateUrl: "./test-charts.component.html",
    styleUrls: ["./test-charts.component.scss"],
})
export class TestChartsComponent {
    visualization$ = this.store.visualization$
    margin = 24

    get chartWidth() {
        return Math.round(
            (globalThis.document?.querySelector(".nt-test-header")
                ?.clientWidth ?? 0) /
                2 -
                this.margin
        )
    }

    constructor(private store: TestStore) {}

    shouldShow(visualization: ITestVisualizationState | null) {
        return (
            visualization?.currentPhaseName !==
                EMeasurementStatus.NOT_STARTED &&
            visualization?.currentPhaseName !== EMeasurementStatus.WAIT &&
            visualization?.currentPhaseName !== EMeasurementStatus.INIT &&
            visualization?.currentPhaseName !== EMeasurementStatus.INIT_DOWN
        )
    }
}
