import { Component } from "@angular/core"
import { from, fromEvent, map, startWith, tap } from "rxjs"
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
    margin$ = fromEvent(window, "resize").pipe(
        startWith(this.margin),
        map(() => this.margin)
    )
    chartHeight$ = fromEvent(window, "resize").pipe(
        startWith(this.chartHeight),
        map(() => this.chartHeight)
    )
    chartWidth$ = fromEvent(window, "resize").pipe(
        startWith(this.chartWidth),
        map(() => this.chartWidth)
    )

    private get isMobile() {
        return this.platform.isMobile || this.platform.isSmallMobile
    }

    private get margin() {
        return this.isMobile ? 0 : 24
    }

    private get chartHeight() {
        return this.isMobile ? 100 : 192
    }

    private get chartWidth() {
        const container =
            globalThis.document?.querySelector("main.app-main--ont")
        if (!container) {
            return 0
        }

        const containerWidth =
            parseInt(window.getComputedStyle(container).width) -
            parseInt(window.getComputedStyle(container).paddingLeft) -
            parseInt(window.getComputedStyle(container).paddingRight)
        return this.isMobile
            ? containerWidth
            : Math.round(containerWidth / 2 - this.margin)
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
