import { Injectable } from "@angular/core"
import { MainStore } from "../store/main.store"
import { ISimpleHistoryResult } from "../../../../measurement/interfaces/simple-history-result.interface"
import {
    Observable,
    catchError,
    concatMap,
    defer,
    from,
    of,
    retry,
    tap,
} from "rxjs"
import { HttpClient, HttpParams } from "@angular/common/http"
import { I18nService } from "src/app/services/i18n.service"
import { MessageService } from "./message.service"
import saveAs from "file-saver"
import { ERROR_OCCURED } from "../constants/strings"
import { ECertifiedLocationType } from "../interfaces/certified-env-form.interface"
import { TestStore } from "../store/test.store"

// The certified PDF aggregates every test of the loop. The backend may still be
// processing/aggregating the results for a short while after the last test
// finishes, so the export request can fail if issued too early. Retry it a
// bounded number of times with a short delay before giving up.
const CERTIFIED_PDF_RETRY_COUNT = 10
const CERTIFIED_PDF_RETRY_DELAY_MS = 2000

@Injectable({
    providedIn: "root",
})
export class HistoryExportService {
    // The last certified PDF (raw bytes), cached so the result screen's PDF
    // button can reopen it without re-requesting it from the backend.
    private lastCertifiedPdf: ArrayBuffer | null = null

    protected get generalUrl() {
        return `${this.mainStore.api?.url_statistic_server}/opentests/search`
    }

    protected get quickPdfUrl() {
        return `${this.mainStore.api?.url_statistic_server}/export/pdf/${this.transloco.getActiveLang()}`
    }

    protected get slowPdfUrl() {
        return `${this.mainStore.api?.url_web_statistic_server}/export/pdf/${this.transloco.getActiveLang()}`
    }

    constructor(
        private testStore: TestStore,
        private mainStore: MainStore,
        private message: MessageService,
        private http: HttpClient,
        private transloco: I18nService,
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

    /**
     * Request the certified PDF and open it in a viewer window. The backend
     * (RMBTStatisticServer) returns the PDF binary DIRECTLY from the export POST
     * (Content-Type: application/pdf) — there is no JSON "file" field and no
     * second GET. The bytes are handed to the Electron main process, which shows
     * them in a reused viewer window keyed by the loop UUID.
     */
    openCertifiedPdf(loopUuid?: string | null): Observable<any> {
        if (this.lastCertifiedPdf) {
            window.electronAPI.openPdfData(
                this.lastCertifiedPdf,
                loopUuid ?? undefined,
            )
            return of(true)
        }
        if (!loopUuid) {
            return of(null)
        }
        this.mainStore.inProgress$.next(true)
        // The export URL is built from the client settings (see MainStore.api).
        // Those are only loaded by the home/settings screens, so ensure they are
        // present before requesting — otherwise the certified wizard (reachable
        // without the home screen) would POST to "undefined/export/pdf/...".
        return this.mainStore.ensureSettings().pipe(
            concatMap(() => {
                if (!this.quickPdfUrl || this.quickPdfUrl.startsWith("undefined")) {
                    return this.handleError()
                }
                return this.requestCertifiedPdf(loopUuid).pipe(
                    concatMap((blob) => from(blob.arrayBuffer())),
                    tap((buffer) => {
                        this.lastCertifiedPdf = buffer
                        window.electronAPI.openPdfData(buffer, loopUuid)
                        this.mainStore.inProgress$.next(false)
                    }),
                )
            }),
            catchError(this.handleError),
        )
    }

    /**
     * POST the certified export request and resolve to the PDF blob the backend
     * returns directly. On a transient failure (e.g. the backend has not yet
     * finished aggregating the loop's results) the request is retried a bounded
     * number of times with a short delay before the error propagates to the
     * caller's catchError. Each attempt rebuilds the form data.
     */
    private requestCertifiedPdf(loopUuid: string): Observable<Blob> {
        return defer(() =>
            this.http.post(this.quickPdfUrl, this.getFormData(loopUuid), {
                headers: { Accept: "application/pdf" },
                responseType: "blob",
            }),
        ).pipe(
            retry({
                count: CERTIFIED_PDF_RETRY_COUNT,
                delay: CERTIFIED_PDF_RETRY_DELAY_MS,
            }),
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
