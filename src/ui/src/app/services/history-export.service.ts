import { Injectable } from "@angular/core"
import { MainStore } from "../store/main.store"
import { ISimpleHistoryResult } from "../../../../measurement/interfaces/simple-history-result.interface"
import { BehaviorSubject, catchError, concatMap, map, of, tap } from "rxjs"
import { HttpClient, HttpParams } from "@angular/common/http"
import { TranslocoService } from "@ngneat/transloco"
import { MessageService } from "./message.service"
import saveAs from "file-saver"
import { ERROR_OCCURED } from "../constants/strings"
import { ECertifiedLocationType } from "../interfaces/certified-env-form.interface"
import { TestStore } from "../store/test.store"

@Injectable({
    providedIn: "root",
})
export class HistoryExportService {
    lastCertifiedPdfUrl$ = new BehaviorSubject("")

    protected get generalUrl() {
        return `${this.mainStore.api?.url_statistic_server}/opentests/search`
    }

    protected get quickPdfUrl() {
        return `${this.mainStore.api?.url_statistic_server}/export/pdf/${this.transloco.getActiveLang()}`
    }

    protected get slowPdfUrl() {
        return `${this.mainStore.api?.url_web_statistic_server}/export/pdf/${this.transloco.getActiveLang()}`
    }

    protected get certifiedPdfUrl() {
        return `${this.mainStore.api?.url_web_statistic_server}/export/pdf/`
    }

    constructor(
        private testStore: TestStore,
        private mainStore: MainStore,
        private message: MessageService,
        private http: HttpClient,
        private transloco: TranslocoService,
    ) {}

    exportAs(format: "csv" | "xlsx", results: ISimpleHistoryResult[]) {
        const exportUrl = this.generalUrl
        if (!exportUrl) {
            return of(null)
        }

        this.mainStore.inProgress$.next(true)
        return this.http
            .post(exportUrl, this.getExportParams(format, results), {
                responseType: "blob",
                observe: "response",
            })
            .pipe(tap(this.saveFile(format)), catchError(this.handleError))
    }

    quickPdfExport(results: any[]) {
        const formdata = new FormData()
        console.log(results)
        formdata.append(
            "open_test_uuid",
            results[0].openTestResponse?.["open_test_uuid"],
        )
        return this.exportAsPdf(results, this.quickPdfUrl, formdata)
    }

    slowPdfExport(results: any[]) {
        return this.exportAsPdf(results, this.slowPdfUrl)
    }

    private exportAsPdf(
        results: any[],
        basePdfUrl: string,
        httpParams?: HttpParams | FormData,
    ) {
        if (!basePdfUrl) {
            return of(null)
        }
        this.mainStore.inProgress$.next(true)
        return this.http
            .post(
                basePdfUrl,
                httpParams || this.getExportParams("pdf", results),
                {
                    headers: { Accept: "application/pdf" },
                    responseType: "blob",
                    observe: "response",
                },
            )
            .pipe(tap(this.saveFile("pdf")), catchError(this.handleError))
    }

    exportAsCertified(loopUuid?: string | null) {
        if (this.lastCertifiedPdfUrl$.value) {
            window.electronAPI.openPdf(this.lastCertifiedPdfUrl$.value)
            return this.lastCertifiedPdfUrl$.asObservable()
        }
        if (!this.slowPdfUrl || !loopUuid) {
            return of(null)
        }
        this.mainStore.inProgress$.next(true)
        return this.http
            .post<any>(this.slowPdfUrl, this.getFormData(loopUuid))
            .pipe(
                concatMap((resp) => {
                    if (resp?.["file"]) {
                        return this.http.get(
                            this.certifiedPdfUrl + resp["file"],
                            {
                                responseType: "blob",
                                observe: "response",
                            },
                        )
                    }
                    return of(null)
                }),
                tap(this.saveFile("pdf")),
                catchError(this.handleError),
            )
    }

    getCertifiedPdfUrl(loopUuid?: string | null) {
        if (!this.slowPdfUrl || !loopUuid) {
            return of(null)
        }
        return this.http
            .post<any>(this.slowPdfUrl, this.getFormData(loopUuid))
            .pipe(
                map((resp: any) => {
                    if (resp?.["file"]) {
                        const fileUrl = this.certifiedPdfUrl + resp["file"]
                        this.lastCertifiedPdfUrl$.next(fileUrl)
                        return fileUrl
                    }
                    return null
                }),
                catchError(this.handleError),
            )
    }

    private saveFile = (format: string) => (data: any) => {
        if (data?.body)
            saveAs(data.body, `${new Date().toISOString()}.${format}`)

        this.mainStore.inProgress$.next(false)
    }

    private handleError = () => {
        this.mainStore.inProgress$.next(false)
        this.message.openSnackbar(ERROR_OCCURED)
        return of(null)
    }

    private getFormData(loopUuid: string) {
        const dataForm = this.testStore.certifiedDataForm$.value
        const envForm = this.testStore.certifiedEnvForm$.value
        const formData = new FormData()
        const textFields = {
            location_type_other: "locationTypeOther",
            type_text: "typeText",
            test_device: "testDevice",
            title_prepend: "titlePrepend",
            first_name: "firstName",
            last_name: "lastName",
            title_append: "titleAppend",
            address: "address",
        }
        formData.append("loop_uuid", "L" + loopUuid)
        if (envForm?.locationType.length) {
            for (const [i, l] of Object.values(
                ECertifiedLocationType,
            ).entries()) {
                if (envForm.locationType.includes(l)) {
                    formData.append(`location_type_${i}`, l)
                }
            }
        }
        for (const [targetField, srcField] of Object.entries(textFields)) {
            if ((envForm as any)?.[srcField]?.length > 0) {
                formData.append(targetField, (envForm as any)?.[srcField])
            } else if ((dataForm as any)?.[srcField]?.length > 0) {
                formData.append(targetField, (dataForm as any)?.[srcField])
            }
        }
        if (!!dataForm?.isFirstCycle) {
            formData.append("first", "y")
        } else {
            formData.append("first", "n")
        }
        if (envForm && Object.keys(envForm.testPictures).length > 0) {
            for (const file of Object.values(envForm.testPictures)) {
                formData.append("test_pictures[]", file)
            }
        }
        return formData
    }

    private getExportParams(format: string, results: ISimpleHistoryResult[]) {
        return new HttpParams({
            fromObject: {
                test_uuid: results.map((hi) => "T" + hi.testUuid).join(","),
                format,
                max_results: 1000,
            },
        })
    }
}
