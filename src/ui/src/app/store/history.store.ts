import { Injectable } from "@angular/core"
import {
    BehaviorSubject,
    catchError,
    of,
    switchMap,
    take,
    tap,
    withLatestFrom,
} from "rxjs"
import { ISimpleHistoryResult } from "../../../../measurement/interfaces/simple-history-result.interface"
import { MainStore } from "./main.store"
import { IPaginator } from "../interfaces/paginator.interface"
import { HttpClient, HttpParams } from "@angular/common/http"
import { saveAs } from "file-saver"
import { TranslocoService } from "@ngneat/transloco"
import { MessageService } from "../services/message.service"
import { ERROR_OCCURED } from "../constants/strings"
import { ISort } from "../interfaces/sort.interface"

export const STATE_UPDATE_TIMEOUT = 200

@Injectable({
    providedIn: "root",
})
export class HistoryStore {
    history$ = new BehaviorSubject<ISimpleHistoryResult[]>([])
    historyPaginator$ = new BehaviorSubject<IPaginator>({
        offset: 0,
    })
    historySort$ = new BehaviorSubject<ISort>({
        active: "measurementDate",
        direction: "desc",
    })

    constructor(
        private mainStore: MainStore,
        private http: HttpClient,
        private transloco: TranslocoService,
        private message: MessageService
    ) {}

    getMeasurementHistory() {
        if (this.mainStore.error$.value) {
            return of([])
        }
        const env = this.mainStore.env$.value
        return this.historyPaginator$.pipe(
            take(1),
            withLatestFrom(this.historySort$),
            switchMap(([paginator, sort]) => {
                if (env?.HISTORY_RESULTS_LIMIT) {
                    this.historyPaginator$.next({
                        offset: paginator.offset + env.HISTORY_RESULTS_LIMIT,
                        limit: env.HISTORY_RESULTS_LIMIT,
                    })
                    return window.electronAPI.getMeasurementHistory(
                        {
                            offset: paginator.offset,
                            limit: env.HISTORY_RESULTS_LIMIT,
                        },
                        sort
                    )
                } else {
                    return window.electronAPI.getMeasurementHistory(
                        {
                            offset: paginator.offset,
                        },
                        sort
                    )
                }
            }),
            tap((history) => {
                if (env?.HISTORY_RESULTS_LIMIT && history) {
                    this.history$.next([...this.history$.value, ...history])
                } else if (!env?.HISTORY_RESULTS_LIMIT && history) {
                    this.history$.next(history)
                }
            })
        )
    }

    resetMeasurementHistory() {
        this.history$.next([])
        this.historyPaginator$.next({ offset: 0 })
    }

    sortMeasurementHistory(sort: ISort, callback: () => any) {
        this.resetMeasurementHistory()
        this.historySort$.next(sort)
        callback()
    }

    exportAsPdf(results: ISimpleHistoryResult[]) {
        const exportUrl = this.mainStore.env$.value?.HISTORY_EXPORT_URL
        if (!exportUrl) {
            return of(null)
        }
        this.mainStore.inProgress$.next(true)
        return this.http
            .post(
                exportUrl + "/pdf/" + this.transloco.getActiveLang(),
                this.getExportParams("pdf", results)
            )
            .pipe(
                switchMap((resp: any) => {
                    if (resp["file"]) {
                        return this.http.get(
                            exportUrl + "/pdf/" + resp["file"],
                            {
                                responseType: "blob",
                                observe: "response",
                            }
                        )
                    }
                    return of(null)
                }),
                tap((data: any) => {
                    if (data?.body)
                        saveAs(data.body, `${new Date().toISOString()}.pdf`)

                    this.mainStore.inProgress$.next(false)
                }),
                catchError(() => {
                    this.mainStore.inProgress$.next(false)
                    this.message.openSnackbar(ERROR_OCCURED)
                    return of(null)
                })
            )
    }

    exportAs(format: "csv" | "xlsx", results: ISimpleHistoryResult[]) {
        const exportUrl = this.mainStore.env$.value?.HISTORY_SEARCH_URL
        if (!exportUrl) {
            return of(null)
        }

        this.mainStore.inProgress$.next(true)
        return this.http
            .post(exportUrl, this.getExportParams(format, results), {
                responseType: "blob",
                observe: "response",
            })
            .pipe(
                tap((data) => {
                    if (data.body)
                        saveAs(
                            data.body,
                            `${new Date().toISOString()}.${format}`
                        )

                    this.mainStore.inProgress$.next(false)
                }),
                catchError(() => {
                    this.mainStore.inProgress$.next(false)
                    this.message.openSnackbar(ERROR_OCCURED)
                    return of(null)
                })
            )
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
