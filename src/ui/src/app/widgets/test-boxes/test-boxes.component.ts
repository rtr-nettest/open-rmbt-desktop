import { Component } from "@angular/core"
import { ITestVisualizationState } from "src/app/interfaces/test-visualization-state.interface"
import { TestStore } from "src/app/store/test.store"
import { EMeasurementStatus } from "../../../../../measurement/enums/measurement-status.enum"

@Component({
    selector: "app-test-boxes",
    templateUrl: "./test-boxes.component.html",
    styleUrls: ["./test-boxes.component.scss"],
})
export class TestBoxesComponent {
    visualization$ = this.store.visualization$

    constructor(private store: TestStore) {}

    getPing(visualization: ITestVisualizationState) {
        return visualization.phases[EMeasurementStatus.PING]
    }

    getDownload(visualization: ITestVisualizationState) {
        return visualization.phases[EMeasurementStatus.DOWN]
    }

    getUpload(visualization: ITestVisualizationState) {
        return visualization.phases[EMeasurementStatus.UP]
    }
}
