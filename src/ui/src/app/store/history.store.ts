import { Injectable } from "@angular/core"
import {
    BehaviorSubject,
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
import { I18nService, Translation } from "src/app/services/i18n.service"
import { ISort } from "../interfaces/sort.interface"
import { ClassificationService } from "../services/classification.service"
import { ConversionService } from "../services/conversion.service"
import { DatePipe } from "@angular/common"
import {
    IHistoryGroupItem,
    IHistoryRowRTR,
} from "../interfaces/history-row.interface"
import { ExpandArrowComponent } from "../widgets/expand-arrow/expand-arrow.component"
import { ICertifiedDataForm } from "../interfaces/certified-data-form.interface"
import { ICertifiedEnvForm } from "../interfaces/certified-env-form.interface"

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
        private transloco: I18nService,
    ) {}

    getFormattedHistory(options?: {
        grouped?: boolean
        loopUuid?: string | null
    }) {
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
                    options?.loopUuid,
                )
                const countedHistory = this.countResults(loopHistory, paginator)
                const h = options?.grouped
                    ? this.groupResults(countedHistory, openLoops)
                    : countedHistory
                const content = h.map(this.historyItemToRowRTR(t, openLoops))
                return {
                    content,
                    totalElements: content.length,
                }
            }),
        )
    }

    // includeFailed off (default) = only completed measurements; on = also
    // failed/unfinished (sent to the control server as include_failed_tests).
    // Passed in per screen so e.g. certified results always include all.
    getMeasurementHistory(includeFailed: boolean = false) {
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
                        sort,
                        includeFailed,
                    )
                } else {
                    return window.electronAPI.getMeasurementHistory(
                        {
                            offset: paginator.offset,
                        },
                        sort,
                        includeFailed,
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
            }),
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
        if (!paginator.limit) {
            return of([])
        }
        return from(
            window.electronAPI.getMeasurementHistory(
                paginator,
                sort ?? this.historySort$.value,
                // Recent history (loop test screen) shows completed only.
                false,
            ),
        ).pipe(
            take(1),
            tap((history) => {
                this.history$.next(history)
            }),
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

    getLoopResults(history: ISimpleHistoryResult[], loopUuid?: string | null) {
        if (!loopUuid) {
            return history
        }
        // The desktop tracks a bare v4 loop uuid, but the stored result carries a
        // leading "L" marker. How that prefix ends up applied differs between
        // measurement engines (the JS engine let the server add it, the native
        // engines round-trip it through the client), which left the loop history
        // empty when a hard-coded "L" + uuid no longer matched. Compare on the
        // bare uuid so the loop's results match regardless of the prefix — a v4
        // uuid never starts with "L", so stripping a leading "L" is unambiguous.
        const bareUuid = (u?: string | null) => (u ?? "").replace(/^L+/, "")
        const target = bareUuid(loopUuid)
        return history.filter((hi) => bareUuid(hi.loopUuid) === target)
    }

    private countResults(
        history: ISimpleHistoryResult[],
        paginator: IPaginator,
    ) {
        return history.map((hi, index) => ({
            ...hi,
            count: paginator.limit ? index + 1 : history.length - index,
        }))
    }

    private historyItemToRowRTR =
        (t: Translation, openLoops: string[]) =>
        (hi: ISimpleHistoryResult & IHistoryGroupItem): IHistoryRowRTR => {
            const locale = this.transloco.getActiveLang()
            const measurementDate = this.datePipe.transform(
                hi.measurementDate,
                "medium",
                undefined,
                locale,
            )!
            if (hi.groupHeader) {
                return {
                    id: hi.loopUuid!,
                    measurementDate,
                    groupHeader: hi.groupHeader,
                    download: " ",
                    upload: " ",
                    ping: " ",
                }
            }
            return {
                id: hi.testUuid!,
                count: hi.count,
                measurementDate,
                downloadClass: this.classification.getPhaseCSSClass(
                    "down",
                    hi.downloadClass,
                ),
                download:
                    hi.downloadKbit != null
                        ? this.conversion
                              .getSignificantDigits(hi.downloadKbit / 1e3)
                              .toLocaleString(locale) +
                          " " +
                          t["Mbps"]
                        : " ",
                uploadClass: this.classification.getPhaseCSSClass(
                    "up",
                    hi.uploadClass,
                ),
                upload:
                    hi.uploadKbit != null
                        ? this.conversion
                              .getSignificantDigits(hi.uploadKbit / 1e3)
                              .toLocaleString(locale) +
                          " " +
                          t["Mbps"]
                        : t["Test failed"],
                pingClass: this.classification.getPhaseCSSClass(
                    "ping",
                    hi.pingClass,
                ),
                ping:
                    hi.ping != null
                        ? hi.ping.toLocaleString(locale) + " " + t["ms"]
                        : " ",
                loopUuid: hi.loopUuid,
                hidden: hi.hidden,
            }
        }
}
