import { Component, OnDestroy } from "@angular/core"
import { Subject, takeUntil, tap } from "rxjs"
import { ICertifiedDataForm } from "src/app/interfaces/certified-data-form.interface"
import { ICertifiedEnvForm } from "src/app/interfaces/certified-env-form.interface"
import { MainStore } from "src/app/store/main.store"
import { TestStore } from "src/app/store/test.store"

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
export class CertifiedScreenComponent implements OnDestroy {
    activeBreadCrumbIndex = EBreadCrumbs.INFO
    breadCrumbs = EBreadCrumbs
    breadCrumbsNames = Object.values(BreadCrumbsNames)
    destroyed$ = new Subject()
    env$ = this.mainStore.env$
    isReady = false
    isDataFormValid = false
    isEnvFormValid = false
    dataForm: ICertifiedDataForm | null = null
    envForm: ICertifiedEnvForm | null = null

    private get form() {
        return { ...(this.dataForm ?? {}), ...(this.envForm ?? {}) }
    }

    constructor(private mainStore: MainStore, private testStore: TestStore) {}

    ngOnDestroy(): void {
        this.destroyed$.next(void 0)
        this.destroyed$.complete()
    }

    back() {
        if (this.activeBreadCrumbIndex <= 0) {
            window.history.back()
            return
        }
        this.activeBreadCrumbIndex--
    }

    forward() {
        if (this.activeBreadCrumbIndex >= this.breadCrumbsNames.length - 1) {
            return
        }
        this.activeBreadCrumbIndex++
    }

    startCertifiedMeasurement() {
        this.activeBreadCrumbIndex = EBreadCrumbs.MEASUREMENT
        this.testStore.maxTestsReached$
            .pipe(
                takeUntil(this.destroyed$),
                tap((isMaxValueReached) => {
                    if (isMaxValueReached) {
                        this.activeBreadCrumbIndex = EBreadCrumbs.RESULT
                    }
                })
            )
            .subscribe()
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
