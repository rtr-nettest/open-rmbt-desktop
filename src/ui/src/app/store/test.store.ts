import { Injectable } from "@angular/core"
import {
    BehaviorSubject,
    concatMap,
    distinctUntilChanged,
    from,
    interval,
    map,
    of,
    tap,
} from "rxjs"
import { TestVisualizationState } from "../dto/test-visualization-state.dto"
import { ITestVisualizationState } from "../interfaces/test-visualization-state.interface"
import { IBasicNetworkInfo } from "../../../../measurement/interfaces/basic-network-info.interface"
import { BasicNetworkInfo } from "../dto/basic-network-info.dto"
import { ISimpleHistoryResult } from "../../../../measurement/interfaces/simple-history-result.interface"
import { TestPhaseState } from "../dto/test-phase-state.dto"
import { EMeasurementStatus } from "../../../../measurement/enums/measurement-status.enum"

const STATE_UPDATE_TIMEOUT = 200

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
    error$ = new BehaviorSubject<Error | null>(null)

    constructor() {}

    launchTest() {
        this.resetState()
        this.setErrorHandler()
        window.electronAPI.runMeasurement()
        return interval(STATE_UPDATE_TIMEOUT).pipe(
            concatMap(() => from(window.electronAPI.getBasicNetworkInfo())),
            distinctUntilChanged(),
            tap((info) => {
                this.basicNetworkInfo$.next(info)
            }),
            concatMap(() => from(window.electronAPI.getMeasurementState())),
            map((phaseState) => {
                const newState = TestVisualizationState.from(
                    this.visualization$.value,
                    phaseState
                )
                this.visualization$.next(newState)
                return newState
            })
        )
    }

    getMeasurementResult(testUuid: string | null) {
        if (!testUuid) {
            return of(null)
        }
        this.setErrorHandler()
        return from(window.electronAPI.getMeasurementResult(testUuid)).pipe(
            map((result) => {
                this.simpleHistoryResult$.next(result)
                const newPhase = new TestPhaseState({
                    phase: EMeasurementStatus.SHOWING_RESULTS,
                    down: result.downloadKbit / 1000,
                    up: result.uploadKbit / 1000,
                    ping: result.ping / 1e6,
                })
                const newState = TestVisualizationState.from(
                    this.visualization$.value,
                    newPhase
                )
                newState.phases[
                    EMeasurementStatus.DOWN
                ].setChartFromOverallResults?.(result.downloadOverTime ?? [])
                newState.phases[
                    EMeasurementStatus.UP
                ].setChartFromOverallResults?.(result.uploadOverTime ?? [])
                this.visualization$.next(newState)
                this.basicNetworkInfo$.next({
                    serverName: result.measurementServerName,
                    ipAddress: result.ipAddress,
                    providerName: result.providerName,
                })
                return result
            })
        )
    }

    private resetState() {
        this.basicNetworkInfo$.next(new BasicNetworkInfo())
        this.visualization$.next(new TestVisualizationState())
        this.simpleHistoryResult$.next(null)
        this.error$.next(null)
    }

    private setErrorHandler() {
        window.electronAPI.onError((error) => {
            this.error$.next(error)
        })
    }
}
