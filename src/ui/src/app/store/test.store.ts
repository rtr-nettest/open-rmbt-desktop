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
import { IMeasurementPhaseState } from "../../../../measurement/interfaces/measurement-phase-state.interface"
import { EMeasurementStatus } from "../../../../measurement/enums/measurement-status.enum"
import { IBasicNetworkInfo } from "../../../../measurement/interfaces/basic-network-info.interface"
import { BasicNetworkInfo } from "../dto/basic-network-info.dto"
import { ISimpleHistoryResult } from "../../../../measurement/interfaces/simple-history-result.interface"
import { Router } from "@angular/router"

declare global {
    interface Window {
        electronAPI: {
            runMeasurement: () => Promise<void>
            getBasicNetworkInfo: () => Promise<IBasicNetworkInfo>
            getMeasurementState: () => Promise<IMeasurementPhaseState>
            getMeasurementResult: (
                testUuid: string
            ) => Promise<ISimpleHistoryResult>
        }
    }
}
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

    launchTest() {
        this.basicNetworkInfo$.next(new BasicNetworkInfo())
        this.visualization$.next(new TestVisualizationState())
        this.simpleHistoryResult$.next(null)
        window.electronAPI.runMeasurement()
        return interval(STATE_UPDATE_TIMEOUT).pipe(
            concatMap(() =>
                from(window.electronAPI.getBasicNetworkInfo()).pipe(
                    distinctUntilChanged(),
                    tap((info) => {
                        this.basicNetworkInfo$.next(info)
                    })
                )
            ),
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
        return from(window.electronAPI.getMeasurementResult(testUuid)).pipe(
            map((result) => {
                this.simpleHistoryResult$.next(result)
                return result
            })
        )
    }

    constructor(private router: Router) {}
}
