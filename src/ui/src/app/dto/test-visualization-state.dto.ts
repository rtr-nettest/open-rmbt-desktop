import { ITestVisualizationState } from "../interfaces/test-visualization-state.interface"
import { ITestItemState } from "../interfaces/test-item-state.interface"
import { EMeasurementStatus } from "../../../../measurement/enums/measurement-status.enum"
import { IMeasurementPhaseState } from "../../../../measurement/interfaces/measurement-phase-state.interface"
import { extend } from "../helpers/extend"
import { ETestStatuses } from "../enums/test-statuses.enum"

export class TestItemState implements ITestItemState {
    testUuid: string = ""
    down: number = -1
    up: number = -1
    ping: number = -1
    chart?: { x: number; y: number }[] | undefined
    container?: ETestStatuses | undefined
    label?: string | undefined
    duration: number = 0
    progress: number = 0
    phase: EMeasurementStatus = EMeasurementStatus.NOT_STARTED
}

export class TestVisualizationState implements ITestVisualizationState {
    phases: {
        [key: string]: ITestItemState
    } = {
        [EMeasurementStatus.NOT_STARTED]: new TestItemState(),
        [EMeasurementStatus.WAIT]: new TestItemState(),
        [EMeasurementStatus.INIT]: new TestItemState(),
        [EMeasurementStatus.INIT_DOWN]: new TestItemState(),
        [EMeasurementStatus.PING]: new TestItemState(),
        [EMeasurementStatus.DOWN]: new TestItemState(),
        [EMeasurementStatus.INIT_UP]: new TestItemState(),
        [EMeasurementStatus.UP]: new TestItemState(),
        [EMeasurementStatus.SPEEDTEST_END]: new TestItemState(),
        [EMeasurementStatus.SUBMITTING_RESULTS]: new TestItemState(),
        [EMeasurementStatus.END]: new TestItemState(),
    }
    currentPhase: EMeasurementStatus = EMeasurementStatus.NOT_STARTED

    static from(
        initialState: ITestVisualizationState,
        phaseState: IMeasurementPhaseState
    ) {
        const newState = extend<ITestVisualizationState>(initialState)
        if (newState.phases[phaseState.phase]) {
            newState.phases[phaseState.phase] = extend<ITestItemState>(
                newState.phases[phaseState.phase],
                phaseState
            )
            newState.currentPhase = phaseState.phase
        }
        return newState
    }

    extendChart(key: string, counter: string | number, progress: number) {
        return [
            ...(this.phases[key]?.chart || []),
            {
                x: progress,
                y: counter === "-" ? 0 : (counter as number),
            },
        ]
    }
}
