import { Component } from "@angular/core"
import { ICertifiedDataForm } from "src/app/interfaces/certified-form.interface"
import { MainStore } from "src/app/store/main.store"

@Component({
    selector: "app-certified-screen",
    templateUrl: "./certified-screen.component.html",
    styleUrls: ["./certified-screen.component.scss"],
})
export class CertifiedScreenComponent {
    activeBreadCrumbIndex = 1
    breadCrumbs = ["Info", "Data", "Environment", "Measurement", "Result"]
    env$ = this.mainStore.env$
    isReady = false

    constructor(private mainStore: MainStore) {}

    nextBreadCrumb() {
        if (this.activeBreadCrumbIndex >= this.breadCrumbs.length - 1) {
            return
        }
        this.activeBreadCrumbIndex++
    }

    startCertifiedMeasurement() {
        console.log("Measurement, here we go!")
    }

    onFormChange(value: ICertifiedDataForm | undefined) {
        if (value && !value.isFirstCycle) {
            this.isReady = true
        } else {
            this.isReady = false
        }
    }
}
