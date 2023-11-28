import { Injectable } from "@angular/core"
import {
    BehaviorSubject,
    catchError,
    combineLatest,
    from,
    map,
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
import { Translation, TranslocoService } from "@ngneat/transloco"
import { MessageService } from "../services/message.service"
import { ERROR_OCCURED } from "../constants/strings"
import { ISort } from "../interfaces/sort.interface"
import { ClassificationService } from "../services/classification.service"
import { ConversionService } from "../services/conversion.service"
import { DatePipe } from "@angular/common"
import {
    IHistoryGroupItem,
    IHistoryRowONT,
    IHistoryRowRTR,
} from "../interfaces/history-row.interface"
import { ExpandArrowComponent } from "../widgets/expand-arrow/expand-arrow.component"

@Injectable({
    providedIn: "root",
})
export class HistoryStore {
    history$ = new BehaviorSubject<Array<ISimpleHistoryResult>>([])
    historyPaginator$ = new BehaviorSubject<IPaginator>({
        offset: 0,
    })
    historySort$ = new BehaviorSubject<ISort>({
        active: "measurementDate",
        direction: "desc",
    })
    openLoops$ = new BehaviorSubject<string[]>([])

    constructor(
        private classification: ClassificationService,
        private conversion: ConversionService,
        private datePipe: DatePipe,
        private mainStore: MainStore,
        private http: HttpClient,
        private transloco: TranslocoService,
        private message: MessageService
    ) {}

    getFormattedHistory(options?: { grouped?: boolean; loopUuid?: string }) {
        return combineLatest([
            this.history$,
            this.transloco.selectTranslation(),
            this.historyPaginator$,
            this.mainStore.env$,
            this.openLoops$,
        ]).pipe(
            map(([history, t, paginator, env, openLoops]) => {
                if (!history.length) {
                    return { content: [], totalElements: 0 }
                }
                const loopHistory = this.getLoopResults(
                    history,
                    options?.loopUuid
                )
                const countedHistory = this.countResults(loopHistory, paginator)
                const h =
                    options?.grouped && env?.FLAVOR !== "ont"
                        ? this.groupResults(countedHistory, openLoops)
                        : countedHistory
                const content =
                    env?.FLAVOR === "ont"
                        ? h.map(this.historyItemToRowONT(t))
                        : h.map(this.historyItemToRowRTR(t, openLoops))
                const totalElements = history[0].paginator?.totalElements
                return {
                    content,
                    totalElements:
                        env?.FLAVOR === "ont" && totalElements
                            ? totalElements
                            : content.length,
                }
            })
        )
    }

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
                if (history) {
                    const h = env?.HISTORY_RESULTS_LIMIT
                        ? [...this.history$.value, ...history]
                        : history
                    this.history$.next(h)
                }
            })
        )
    }

    private groupResults(history: ISimpleHistoryResult[], openLoops: string[]) {
        const retVal: Array<ISimpleHistoryResult & IHistoryGroupItem> = []
        const grouped: Set<string> = new Set()
        for (let i = 0; i < history.length; i++) {
            if (history[i].loopUuid) {
                if (!grouped.has(history[i].loopUuid!)) {
                    grouped.add(history[i].loopUuid!)
                    retVal.push({
                        ...history[i],
                        groupHeader: true,
                    })
                }
                retVal.push({
                    ...history[i],
                    hidden: !openLoops.includes(history[i].loopUuid!),
                })
            } else {
                retVal.push(history[i])
            }
        }
        return retVal
    }

    getRecentMeasurementHistory(paginator: IPaginator, sort?: ISort) {
        if (this.mainStore.error$.value || !paginator.limit) {
            return of([])
        }
        return from(
            window.electronAPI.getMeasurementHistory(
                paginator,
                sort ?? this.historySort$.value
            )
        ).pipe(
            take(1),
            tap((history) => {
                this.history$.next(history)
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

    getLoopResults(history: ISimpleHistoryResult[], loopUuid?: string) {
        if (!loopUuid) {
            return history
        }
        return history.filter((hi) => hi.loopUuid === "L" + loopUuid)
    }

    private countResults(
        history: ISimpleHistoryResult[],
        paginator: IPaginator
    ) {
        return history.map((hi, index) => ({
            ...hi,
            count: paginator.limit ? index + 1 : history.length - index,
        }))
    }

    private historyItemToRowONT =
        (t: Translation) =>
        (hi: ISimpleHistoryResult): IHistoryRowONT => {
            const locale = this.transloco.getActiveLang()
            return {
                id: hi.testUuid!,
                measurementDate: this.datePipe.transform(
                    hi.measurementDate,
                    "mediumDate",
                    undefined,
                    locale
                )!,
                time: this.datePipe.transform(
                    hi.measurementDate,
                    "mediumTime",
                    undefined,
                    locale
                )!,
                download: this.conversion
                    .getSignificantDigits(hi.downloadKbit / 1e3)
                    .toLocaleString(locale),
                upload: this.conversion
                    .getSignificantDigits(hi.uploadKbit / 1e3)
                    .toLocaleString(locale),
                ping: this.conversion
                    .getSignificantDigits(hi.ping)
                    .toLocaleString(locale),
                providerName: hi.providerName,
            }
        }

    private historyItemToRowRTR =
        (t: Translation, openLoops: string[]) =>
        (hi: ISimpleHistoryResult & IHistoryGroupItem): IHistoryRowRTR => {
            const locale = this.transloco.getActiveLang()
            const measurementDate = this.datePipe.transform(
                hi.measurementDate,
                "medium",
                undefined,
                locale
            )!
            if (hi.groupHeader) {
                return {
                    id: hi.loopUuid!,
                    measurementDate,
                    groupHeader: hi.groupHeader,
                    details: ExpandArrowComponent,
                    componentField: "details",
                    parameters: {
                        expanded: openLoops.includes(hi.loopUuid!),
                    },
                }
            }
            return {
                id: hi.testUuid!,
                count: hi.count,
                measurementDate,
                download:
                    this.classification.getIconByClass(hi.downloadClass) +
                    this.conversion
                        .getSignificantDigits(hi.downloadKbit / 1e3)
                        .toLocaleString(locale) +
                    " " +
                    t["Mbps"],
                upload:
                    this.classification.getIconByClass(hi.uploadClass) +
                    this.conversion
                        .getSignificantDigits(hi.uploadKbit / 1e3)
                        .toLocaleString(locale) +
                    " " +
                    t["Mbps"],
                ping:
                    this.classification.getIconByClass(hi.pingClass) +
                    hi.ping.toLocaleString(locale) +
                    " " +
                    t["ms"],
                loopUuid: hi.loopUuid,
                hidden: hi.hidden,
            }
        }
}
