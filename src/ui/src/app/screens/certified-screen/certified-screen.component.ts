import { Component } from "@angular/core"
import { ICertifiedDataForm } from "src/app/interfaces/certified-data-form.interface"
import { ICertifiedEnvForm } from "src/app/interfaces/certified-env-form.interface"
import { MainStore } from "src/app/store/main.store"

enum EBreadCrumbs {
    INFO,
    DATA,
    ENVIRONMENT,
    MEASUREMENT,
    RESULT,
}

const BreadCrumbsNames = {
    [EBreadCrumbs.INFO]: "Info",
    [EBreadCrumbs.DATA]: "Data",
    [EBreadCrumbs.ENVIRONMENT]: "Environment",
    [EBreadCrumbs.MEASUREMENT]: "Measurement",
    [EBreadCrumbs.RESULT]: "Result",
}

@Component({
    selector: "app-certified-screen",
    templateUrl: "./certified-screen.component.html",
    styleUrls: ["./certified-screen.component.scss"],
})
export class CertifiedScreenComponent {
    activeBreadCrumbIndex = EBreadCrumbs.INFO
    breadCrumbs = EBreadCrumbs
    breadCrumbsNames = Object.values(BreadCrumbsNames)
    env$ = this.mainStore.env$
    isReady = false
    isDataFormValid = false
    isEnvFormValid = false
    dataForm: ICertifiedDataForm | null = null
    envForm: ICertifiedEnvForm | null = null

    private get form() {
        return { ...(this.dataForm ?? {}), ...(this.envForm ?? {}) }
    }

    constructor(private mainStore: MainStore) {}

    nextBreadCrumb() {
        if (this.activeBreadCrumbIndex >= this.breadCrumbsNames.length - 1) {
            return
        }
        this.activeBreadCrumbIndex++
    }

    startCertifiedMeasurement() {
        console.log("Measurement, here we go!")
    }

    onDataFormChange(value: ICertifiedDataForm | null) {
        if (value) {
            this.isDataFormValid = true
            if (!value.isFirstCycle) {
                this.isReady = true
            } else {
                this.isReady = false
            }
        } else {
            this.isDataFormValid = false
            this.isReady = false
        }
        this.dataForm = value
    }

    onEnvFormChange(value: ICertifiedEnvForm | null) {
        if (value) {
            this.isEnvFormValid = true
            this.isReady = true
        } else {
            this.isEnvFormValid = false
            this.isReady = false
        }
        this.envForm = value
    }
}
