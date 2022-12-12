import { Injectable } from "@angular/core"
import {
    BehaviorSubject,
    concatMap,
    from,
    interval,
    map,
    Observable,
    of,
    Subscription,
    switchMap,
    tap,
} from "rxjs"
import { TestVisualizationState } from "../dto/test-visualization-state.dto"
import { ITestVisualizationState } from "../interfaces/test-visualization-state.interface"
import { ITestPhaseState } from "../../../../measurement/interfaces/test-phase-state.interface"
import { EMeasurementStatus } from "../../../../measurement/enums/measurement-status.enum"

declare global {
    interface Window {
        electronAPI: {
            runMeasurement: () => Promise<void>
            getMeasurementState: () => Promise<ITestPhaseState>
            onMeasurementFinish: (
                callback: (results: ITestPhaseState[]) => any
            ) => any
        }
    }
}
const STATE_UPDATE_TIMEOUT = 200

@Injectable({
    providedIn: "root",
})
export class TestStore {
    visualization$ = new BehaviorSubject<ITestVisualizationState>(
        new TestVisualizationState()
    )

    launchTest() {
        return from(window.electronAPI.runMeasurement()).pipe(
            switchMap(() => interval(STATE_UPDATE_TIMEOUT)),
            concatMap(() => from(window.electronAPI.getMeasurementState())),
            tap((phaseState) => {
                const newState = TestVisualizationState.from(
                    this.visualization$.value,
                    phaseState
                )
                this.visualization$.next(newState)
            })
        )
    }
}
