import { ChangeDetectionStrategy, Component, NgZone } from "@angular/core"
import { tap } from "rxjs"
import { ITestPhaseState } from "src/app/interfaces/test-phase-state.interface"
import { TestStore } from "src/app/store/test.store"
import { EMeasurementStatus } from "../../../../../measurement/enums/measurement-status.enum"
import { TranslocoService } from "@ngneat/transloco"
import { ConversionService } from "src/app/services/conversion.service"

@Component({
    selector: "app-gauge",
    templateUrl: "./gauge.component.html",
    styleUrls: ["./gauge.component.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GaugeComponent {
    visualization$ = this.store.visualization$.pipe(
        tap((state) => {
            this.ngZone.runOutsideAngular(() => {
                this.drawLoop(state.phases[state.currentPhaseName])
            })
        })
    )

    constructor(
        private conversion: ConversionService,
        private store: TestStore,
        private ngZone: NgZone,
        private transloco: TranslocoService
    ) {}

    private getProgressSegment(status: EMeasurementStatus, progress: number) {
        var ProgressSegmentsTotal = 96
        var ProgressSegmentsInit = 1
        var ProgressSegmentsInitDown = 13
        var ProgressSegmentsPing = 15
        var ProgressSegmentsDown = 34
        var ProgressSegmentsInitUp = 4
        var ProgressSegmentsUp = 29
        var progressValue = 0
        var progressSegments = 0
        switch (status) {
            case EMeasurementStatus.INIT:
                progressSegments = +Math.round(ProgressSegmentsInit * progress)
                break
            case EMeasurementStatus.INIT_DOWN:
                progressSegments =
                    ProgressSegmentsInit +
                    Math.round(ProgressSegmentsInitDown * progress)
                break
            case EMeasurementStatus.PING:
                progressSegments =
                    ProgressSegmentsInit +
                    ProgressSegmentsInitDown +
                    Math.round(ProgressSegmentsPing * progress)
                break
            case EMeasurementStatus.DOWN:
                progressSegments =
                    ProgressSegmentsInit +
                    ProgressSegmentsInitDown +
                    ProgressSegmentsPing +
                    Math.round(ProgressSegmentsDown * progress)
                break
            case EMeasurementStatus.INIT_UP:
                progressSegments =
                    ProgressSegmentsInit +
                    ProgressSegmentsInitDown +
                    ProgressSegmentsPing +
                    ProgressSegmentsDown +
                    Math.round(ProgressSegmentsInitUp * progress)
                break
            case EMeasurementStatus.UP:
                progressSegments =
                    ProgressSegmentsInit +
                    ProgressSegmentsInitDown +
                    ProgressSegmentsPing +
                    ProgressSegmentsDown +
                    ProgressSegmentsInitUp +
                    Math.round(ProgressSegmentsUp * progress)
                progressSegments = Math.min(95, progressSegments)
                break
            case EMeasurementStatus.SUBMITTING_RESULTS:
            case EMeasurementStatus.END:
                progressSegments = ProgressSegmentsTotal
                break
            case EMeasurementStatus.QOS_TEST_RUNNING:
                progressSegments = 95
                break
            case EMeasurementStatus.SPEEDTEST_END:
            case EMeasurementStatus.QOS_END:
                progressSegments = 95
                break
            case EMeasurementStatus.ERROR:
            case EMeasurementStatus.ABORTED:
                progressSegments = 0
                break
        }
        progressValue = progressSegments / ProgressSegmentsTotal
        return progressValue
    }

    private setBarPercentage(barSelector: string, percents: number) {
        var bar = document.querySelector(barSelector) as SVGGeometryElement
        if (!bar) {
            console.error("Element not found: " + barSelector + ".")
        } else {
            bar.style.strokeDasharray =
                bar.getTotalLength() * percents + ",9999"
        }
    }

    private drawLoop(phaseState: ITestPhaseState) {
        const locale = this.transloco.getActiveLang()
        let { phase: status, progress, counter } = phaseState
        let barSelector = null
        let directionSymbol = null
        let speedMbit = -1
        const fullProgress = Math.round(
            this.getProgressSegment(status, progress) * 100
        )
        const percents = document.querySelector("#percents")
        if (percents) {
            percents.textContent = fullProgress + "\u200a%"
        }
        switch (status) {
            case EMeasurementStatus.INIT:
                barSelector = "#init"
                progress = progress * 0.1
                break
            case EMeasurementStatus.INIT_DOWN:
                barSelector = "#init"
                progress = progress * 0.9 + 0.1
                break
            case EMeasurementStatus.PING:
                this.setBarPercentage("#init", 1)
                barSelector = "#ping"
                break
            case EMeasurementStatus.DOWN:
                this.setBarPercentage("#ping", 1)
                barSelector = "#download"
                //set symbol as unicode, since IE won't handle html entities
                speedMbit = counter
                directionSymbol = "\u21a7" //↧
                break
            case EMeasurementStatus.INIT_UP:
                this.setBarPercentage("#download", 1)
                barSelector = "#upload"
                progress = Math.min(0.95, progress * 0.1)
                directionSymbol = "\u21a5" //↥
                break
            case EMeasurementStatus.UP:
                barSelector = "#upload"
                progress = Math.min(0.95, progress * 0.9 + 0.1)
                speedMbit = counter
                directionSymbol = "\u21a5" //↥
                break
            case EMeasurementStatus.SUBMITTING_RESULTS:
            case EMeasurementStatus.END:
                barSelector = "#upload"
                progress = 1
                break
        }
        if (barSelector !== null) {
            this.setBarPercentage(barSelector, progress)
        }

        const speedTextEl = document.querySelector("#speedtext")
        const speedUnitEl = document.querySelector("#speedunit")
        const speedEl = document.querySelector("#speed")
        if (!speedTextEl || !speedUnitEl || !speedEl) {
            return
        }
        //if speed information is available - set text
        if (speedMbit !== null && speedMbit > 0) {
            //logarithmic to 10Gbit
            var barPercent = (2 + Math.log10(speedMbit / 10)) / 5
            //but cap at [0,1]
            barPercent = Math.max(barPercent, 0)
            barPercent = Math.min(1, barPercent)
            this.setBarPercentage("#speed", barPercent)

            speedTextEl.innerHTML =
                '<tspan style="fill:#59b200">' +
                directionSymbol +
                "</tspan>\u200a" +
                this.conversion
                    .getSignificantDigits(speedMbit)
                    .toLocaleString(locale)
            speedUnitEl.textContent = this.transloco.translate("Mbps")

            //enable smoothing animations on speed gauge, as soon as initial speed value is set
            //as not to visualize a gradually increase of speed
            setTimeout(function () {
                speedEl.setAttribute("class", "gauge speed active")
            }, 500)
        }
        //if only direction symbol is set - display this (init upload phase)
        else if (directionSymbol !== null) {
            speedEl.setAttribute("class", "gauge speed")
            this.setBarPercentage("#speed", 0)
            speedTextEl.innerHTML =
                '<tspan style="fill:#59b200">' + directionSymbol + "</tspan>"
        }
        //if no speed is available - clear fields, but without any animations
        else {
            speedEl.setAttribute("class", "gauge speed")
            this.setBarPercentage("#speed", 0)
            speedTextEl.textContent = ""
            speedUnitEl.textContent = ""
        }
    }
}
