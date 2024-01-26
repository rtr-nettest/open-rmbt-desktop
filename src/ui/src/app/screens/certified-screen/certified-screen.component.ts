import { Component, OnDestroy } from "@angular/core"
import { Subject, firstValueFrom, takeWhile, tap } from "rxjs"
import { ICertifiedDataForm } from "src/app/interfaces/certified-data-form.interface"
import { ICertifiedEnvForm } from "src/app/interfaces/certified-env-form.interface"
import { HistoryExportService } from "src/app/services/history-export.service"
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
    loopUuid = ""

    constructor(
        private mainStore: MainStore,
        private testStore: TestStore,
        private exporter: HistoryExportService
    ) {}

    ngOnDestroy(): void {
        this.destroyed$.next(void 0)
        this.destroyed$.complete()
    }

    back() {
        if (this.activeBreadCrumbIndex <= 0) {
            window.history.back()
            return
        }
        if (this.activeBreadCrumbIndex === this.breadCrumbs.RESULT) {
            this.activeBreadCrumbIndex -= 3
        } else {
            this.activeBreadCrumbIndex--
        }
    }

    forward() {
        if (this.activeBreadCrumbIndex >= this.breadCrumbsNames.length - 1) {
            return
        }
        this.activeBreadCrumbIndex++
    }

    startCertifiedMeasurement() {
        this.testStore.maxTestsReached$
            .pipe(
                tap((isMaxValueReached) => {
                    if (isMaxValueReached) {
                        firstValueFrom(
                            this.exporter.getCertifiedPdfUrl(this.loopUuid)
                        ).then((url) =>
                            url ? window.electronAPI.openPdf(url) : void 0
                        )
                        this.activeBreadCrumbIndex = EBreadCrumbs.RESULT
                        this.testStore.disableLoopMode()
                    }
                }),
                takeWhile((isMaxValueReached) => !isMaxValueReached)
            )
            .subscribe()
        this.loopUuid = this.testStore.launchCertifiedTest().loop_uuid
        this.activeBreadCrumbIndex = EBreadCrumbs.MEASUREMENT
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
        this.testStore.certifiedDataForm$.next(value)
    }

    onEnvFormChange(value: ICertifiedEnvForm | null) {
        if (value) {
            this.isEnvFormValid = true
            this.isReady = true
        } else {
            this.isEnvFormValid = false
            this.isReady = false
        }
        this.testStore.certifiedEnvForm$.next(value)
    }
}
