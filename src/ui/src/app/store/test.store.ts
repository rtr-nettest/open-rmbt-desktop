import { Injectable } from "@angular/core"
import {
    BehaviorSubject,
    concatMap,
    from,
    interval,
    map,
    of,
    switchMap,
    take,
    tap,
    withLatestFrom,
} from "rxjs"
import { TestVisualizationState } from "../dto/test-visualization-state.dto"
import { ITestVisualizationState } from "../interfaces/test-visualization-state.interface"
import { IBasicNetworkInfo } from "../../../../measurement/interfaces/basic-network-info.interface"
import { BasicNetworkInfo } from "../dto/basic-network-info.dto"
import { ISimpleHistoryResult } from "../../../../measurement/interfaces/simple-history-result.interface"
import { TestPhaseState } from "../dto/test-phase-state.dto"
import { EMeasurementStatus } from "../../../../measurement/enums/measurement-status.enum"
import { Router } from "@angular/router"
import { MainStore } from "./main.store"
import { IPaginator } from "../interfaces/paginator.interface"
import { HttpClient, HttpParams } from "@angular/common/http"
import { saveAs } from "file-saver"
import { TranslocoService } from "@ngneat/transloco"

export const STATE_UPDATE_TIMEOUT = 200

@Injectable({
    providedIn: "root",
})
export class TestStore {
    basicNetworkInfo$ = new BehaviorSubject<IBasicNetworkInfo>(
        new BasicNetworkInfo()
    )
    visualization$ = new BehaviorSubject<ITestVisualizationState>(
        new TestVisualizationState()
    )
    simpleHistoryResult$ = new BehaviorSubject<ISimpleHistoryResult | null>(
        null
    )
    history$ = new BehaviorSubject<ISimpleHistoryResult[]>([])
    historyPaginator$ = new BehaviorSubject<IPaginator>({
        offset: 0,
    })
    allHistoryLoaded$ = new BehaviorSubject<boolean>(false)

    constructor(
        private mainStore: MainStore,
        private router: Router,
        private http: HttpClient,
        private transloco: TranslocoService
    ) {}

    launchTest() {
        this.resetState()
        window.electronAPI.runMeasurement()
        return interval(STATE_UPDATE_TIMEOUT).pipe(
            concatMap(() => from(window.electronAPI.getMeasurementState())),
            map((phaseState) => {
                const newState = TestVisualizationState.from(
                    this.visualization$.value,
                    phaseState,
                    this.mainStore.env$.value?.FLAVOR ?? "rtr"
                )
                this.visualization$.next(newState)
                this.basicNetworkInfo$.next(phaseState)
                return newState
            })
        )
    }

    getMeasurementHistory() {
        if (this.mainStore.error$.value || this.allHistoryLoaded$.value) {
            return of([])
        }
        return from(this.mainStore.env$).pipe(
            withLatestFrom(this.historyPaginator$, this.history$),
            take(1),
            switchMap(([env, paginator, history]) => {
                if (env?.HISTORY_RESULTS_LIMIT) {
                    this.historyPaginator$.next({
                        offset: paginator.offset + env.HISTORY_RESULTS_LIMIT,
                        limit: env.HISTORY_RESULTS_LIMIT,
                    })
                    return window.electronAPI.getMeasurementHistory(
                        paginator.offset,
                        env.HISTORY_RESULTS_LIMIT
                    )
                } else if (!history.length) {
                    return window.electronAPI.getMeasurementHistory(
                        paginator.offset
                    )
                }
                return of(null)
            }),
            tap((history) => {
                if (history) {
                    this.history$.next([...this.history$.value, ...history])
                } else {
                    this.allHistoryLoaded$.next(true)
                }
            })
        )
    }

    getMeasurementResult(testUuid: string | null) {
        if (!testUuid || this.mainStore.error$.value) {
            return of(null)
        }
        return from(window.electronAPI.getMeasurementResult(testUuid)).pipe(
            map((result) => {
                this.simpleHistoryResult$.next(result)
                const newPhase = new TestPhaseState({
                    phase: EMeasurementStatus.SHOWING_RESULTS,
                    down: result.downloadKbit / 1000,
                    up: result.uploadKbit / 1000,
                    ping: result.ping / 1e6,
                })
                const newState = TestVisualizationState.fromHistoryResult(
                    result,
                    this.visualization$.value,
                    newPhase,
                    this.mainStore.env$.value?.FLAVOR ?? "rtr"
                )
                this.visualization$.next(newState)
                this.basicNetworkInfo$.next({
                    serverName: result.measurementServerName,
                    ipAddress: result.ipAddress,
                    providerName: result.providerName,
                })
                window.electronAPI.getEnv().then((env) => {
                    if (
                        env.ENABLE_LOOP_MODE === "true" &&
                        !this.mainStore.error$.value
                    ) {
                        setTimeout(
                            () => this.router.navigateByUrl("/test"),
                            1000
                        )
                    }
                })
                return result
            })
        )
    }

    exportAsPdf(results: ISimpleHistoryResult[]) {
        const exportUrl = this.mainStore.env$.value?.HISTORY_EXPORT_URL
        if (!exportUrl) {
            return
        }
        this.http
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
                })
            )
            .subscribe((data: any) => {
                if (data?.body)
                    saveAs(data.body, `${new Date().toISOString()}.pdf`)
            })
    }

    exportAs(format: "csv" | "xlsx", results: ISimpleHistoryResult[]) {
        const exportUrl = this.mainStore.env$.value?.HISTORY_SEARCH_URL
        if (!exportUrl) {
            return
        }
        this.http
            .post(exportUrl, this.getExportParams(format, results), {
                responseType: "blob",
                observe: "response",
            })
            .subscribe((data) => {
                if (data.body)
                    saveAs(data.body, `${new Date().toISOString()}.${format}`)
            })
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

    private resetState() {
        this.basicNetworkInfo$.next(new BasicNetworkInfo())
        this.visualization$.next(new TestVisualizationState())
        this.simpleHistoryResult$.next(null)
        this.mainStore.error$.next(null)
    }
}
