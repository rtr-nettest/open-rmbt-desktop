import { Component, OnDestroy, ChangeDetectionStrategy } from "@angular/core"
import {
    Subject,
    Subscription,
    firstValueFrom,
    takeUntil,
    takeWhile,
    tap,
} from "rxjs"
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
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false,
})
export class CertifiedScreenComponent implements OnDestroy {
    activeBreadCrumbIndex = EBreadCrumbs.INFO
    breadCrumbs = EBreadCrumbs
    breadCrumbsNames = Object.values(BreadCrumbsNames)
    destroyed$ = new Subject()
    env$ = this.mainStore.env$
    isDataFormValid = false
    isEnvFormValid = false
    loopUuid = ""
    isFirstCycle = true
    // Tracks the single in-flight "max tests reached → open PDF" subscription so
    // repeated Start clicks (the button is also reachable on the DATA step for
    // non-first cycles) never stack multiple subscriptions that would each open
    // the result PDF.
    private maxTestsSub?: Subscription

    constructor(
        private mainStore: MainStore,
        private testStore: TestStore,
        private exporter: HistoryExportService,
    ) {}

    ngOnDestroy(): void {
        this.maxTestsSub?.unsubscribe()
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
        // Replace any previous (not-yet-completed) subscription so a second Start
        // never leaves two live subscriptions both opening the result PDF.
        this.maxTestsSub?.unsubscribe()
        let pdfOpened = false
        this.maxTestsSub = this.testStore.maxTestsReached$
            .pipe(
                takeUntil(this.destroyed$),
                tap((isMaxValueReached) => {
                    if (isMaxValueReached && !pdfOpened) {
                        pdfOpened = true
                        firstValueFrom(
                            this.exporter.openCertifiedPdf(
                                this.testStore.loopUuid$.value,
                            ),
                        ).catch(() => void 0)
                        this.activeBreadCrumbIndex = EBreadCrumbs.RESULT
                        this.testStore.disableLoopMode()
                    }
                }),
                takeWhile((isMaxValueReached) => !isMaxValueReached),
            )
            .subscribe()
        // The loop UUID is minted by the server on the first test and learned from
        // the measurement state; keep the result screen's input in sync with it
        // (never generated or captured here).
        this.testStore.loopUuid$
            .pipe(takeUntil(this.destroyed$))
            .subscribe((u) => (this.loopUuid = u ?? ""))
        this.testStore.launchCertifiedTest()
        this.activeBreadCrumbIndex = EBreadCrumbs.MEASUREMENT
    }

    onDataFormChange(value: ICertifiedDataForm) {
        this.isFirstCycle = value?.isFirstCycle ?? true
        this.isDataFormValid = value.isValid
        this.testStore.certifiedDataForm$.next(value)
    }

    onEnvFormChange(value: ICertifiedEnvForm) {
        this.isEnvFormValid = value.isValid
        this.testStore.certifiedEnvForm$.next(value)
    }
}
