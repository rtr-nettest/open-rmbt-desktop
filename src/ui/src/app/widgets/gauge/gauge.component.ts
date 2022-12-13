import { Component, NgZone } from "@angular/core"
import { tap } from "rxjs"
import { getSignificantDigits } from "src/app/helpers/number"
import { ITestItemState } from "src/app/interfaces/test-item-state.interface"
import { TestStore } from "src/app/store/test.store"
import { EMeasurementStatus } from "../../../../../measurement/enums/measurement-status.enum"

@Component({
    selector: "app-gauge",
    templateUrl: "./gauge.component.html",
    styleUrls: ["./gauge.component.scss"],
})
export class GaugeComponent {
    visualization$ = this.testStore.visualization$.pipe(
        tap((state) => {
            this.ngZone.runOutsideAngular(() => {
                this.drawLoop(state.phases[state.currentPhase])
            })
        })
    )

    constructor(private testStore: TestStore, private ngZone: NgZone) {}

    setBarPercentage(barSelector: string, percents: number) {
        var bar = document.querySelector(barSelector) as SVGGeometryElement
        if (!bar) {
            console.error("Element not found: " + barSelector + ".")
        } else {
            bar.style.strokeDasharray =
                bar.getTotalLength() * percents + ",9999"
        }
    }

    drawLoop(phaseState: ITestItemState) {
        let { phase: status, progress, value: speedMbit } = phaseState
        var barSelector = null
        var directionSymbol = null
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
                barSelector = "#ping"
                break
            case EMeasurementStatus.DOWN:
                this.setBarPercentage("#ping", 1)
                barSelector = "#download"
                //set symbol as unicode, since IE won't handle html entities
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
                directionSymbol = "\u21a5" //↥
                break
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
            //logarithmic to 1Gbit
            var speedLog = (2 + Math.log10(speedMbit)) / 5
            //but cap at [0,1]
            speedLog = Math.max(speedLog, 0)
            speedLog = Math.min(1, speedLog)
            this.setBarPercentage("#speed", speedLog)

            //set .text and .html, since .html is not ignored by Internet Explorer
            //\u2009 = unicode "hair space"
            speedTextEl.textContent =
                directionSymbol + "\u2009" + getSignificantDigits(speedMbit)
            speedTextEl.innerHTML =
                '<tspan style="fill:#59b200">' +
                directionSymbol +
                "</tspan>\u200a" +
                getSignificantDigits(speedMbit)
            speedUnitEl.textContent = "Mbps"

            //enable smoothing animations on speed gauge, as soon as initial speed value is set
            //as not to visualize a gradually increase of speed
            setTimeout(function () {
                speedEl.setAttribute("class", "gauge speed active")
            }, 500)
        }
        //if only direction symbol is set - display this (init upload phase)
        else if (directionSymbol !== null) {
            //again set .text and .html for Internet Explorer
            speedTextEl.textContent = directionSymbol
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
