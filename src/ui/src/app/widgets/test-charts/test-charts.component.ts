import { Component } from "@angular/core"
import { ITestVisualizationState } from "src/app/interfaces/test-visualization-state.interface"
import { PlatformService } from "src/app/services/platform.service"
import { TestStore } from "src/app/store/test.store"
import { EMeasurementStatus } from "../../../../../measurement/enums/measurement-status.enum"

@Component({
    selector: "app-test-charts",
    templateUrl: "./test-charts.component.html",
    styleUrls: ["./test-charts.component.scss"],
})
export class TestChartsComponent {
    visualization$ = this.store.visualization$

    get isMobile() {
        return this.platform.isMobile || this.platform.isSmallMobile
    }

    get margin() {
        return this.isMobile ? 0 : 24
    }

    get chartHeight() {
        return this.isMobile ? 100 : 192
    }

    get chartWidth() {
        const headerWidth =
            globalThis.document?.querySelector(".nt-test-header")
                ?.clientWidth ?? 0
        return this.isMobile
            ? headerWidth
            : Math.round(headerWidth / 2 - this.margin)
    }

    constructor(private platform: PlatformService, private store: TestStore) {}

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
