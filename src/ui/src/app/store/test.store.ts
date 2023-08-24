import { Injectable } from "@angular/core"
import {
    BehaviorSubject,
    catchError,
    concatMap,
    from,
    interval,
    map,
    of,
    switchMap,
    take,
    tap,
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
import { MessageService } from "../services/message.service"
import { ERROR_OCCURED } from "../constants/strings"
import { IMeasurementServerResponse } from "../../../../measurement/interfaces/measurement-server-response.interface"

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
    servers$ = new BehaviorSubject<IMeasurementServerResponse[]>([])

    constructor(
        private mainStore: MainStore,
        private router: Router,
        private http: HttpClient,
        private transloco: TranslocoService,
        private message: MessageService
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
        if (this.mainStore.error$.value) {
            return of([])
        }
        const env = this.mainStore.env$.value
        const startPaginator = this.historyPaginator$.value
        return this.historyPaginator$.pipe(
            take(1),
            switchMap((paginator) => {
                if (env?.HISTORY_RESULTS_LIMIT) {
                    this.historyPaginator$.next({
                        offset: paginator.offset + env.HISTORY_RESULTS_LIMIT,
                        limit: env.HISTORY_RESULTS_LIMIT,
                    })
                    return window.electronAPI.getMeasurementHistory(
                        paginator.offset,
                        env.HISTORY_RESULTS_LIMIT
                    )
                } else {
                    return window.electronAPI.getMeasurementHistory(
                        paginator.offset
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

    getServers() {
        window.electronAPI.getServers().then((servers) => {
            this.servers$.next(servers)
        })
    }

    setActiveServer(server: IMeasurementServerResponse) {
        window.electronAPI.setActiveServer(server)
        const updatedServers = this.servers$.value.map((s) =>
            s.webAddress === server.webAddress
                ? { ...s, active: true }
                : { ...s, active: false }
        )
        this.servers$.next(updatedServers)
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

    private resetState() {
        this.basicNetworkInfo$.next(new BasicNetworkInfo())
        this.visualization$.next(new TestVisualizationState())
        this.simpleHistoryResult$.next(null)
        this.mainStore.error$.next(null)
    }
}
