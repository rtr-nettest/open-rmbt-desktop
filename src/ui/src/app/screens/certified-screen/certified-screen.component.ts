import { Component } from "@angular/core"
import { ICertifiedDataForm } from "src/app/interfaces/certified-data-form.interface"
import { ICertifiedEnvForm } from "src/app/interfaces/certified-env-form.interface"
import { MainStore } from "src/app/store/main.store"

@Component({
    selector: "app-certified-screen",
    templateUrl: "./certified-screen.component.html",
    styleUrls: ["./certified-screen.component.scss"],
})
export class CertifiedScreenComponent {
    activeBreadCrumbIndex = 2
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

    onDataFormChange(value: ICertifiedDataForm | null) {
        if (value && !value.isFirstCycle) {
            this.isReady = true
        } else {
            this.isReady = false
        }
    }

    onEnvFormChange(value: ICertifiedEnvForm | null) {
        if (value) {
            this.isReady = true
        } else {
            this.isReady = false
        }
    }
}
