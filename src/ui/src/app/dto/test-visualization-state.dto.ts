import { ITestVisualizationState } from "../interfaces/test-visualization-state.interface"
import { ITestItemState } from "../interfaces/test-item-state.interface"
import { EMeasurementStatus } from "../../../../measurement/enums/measurement-status.enum"
import { IMeasurementPhaseState } from "../../../../measurement/interfaces/measurement-phase-state.interface"
import { extend } from "../helpers/extend"
import { TestItemState } from "./test-item-state.dto"
import { ETestStatuses } from "../enums/test-statuses.enum"
import { ETestLabels } from "../enums/test-labels.enum"

export class TestVisualizationState implements ITestVisualizationState {
    phases: {
        [key: string]: ITestItemState
    } = {
        [EMeasurementStatus.NOT_STARTED]: new TestItemState(),
        [EMeasurementStatus.WAIT]: new TestItemState(),
        [EMeasurementStatus.INIT]: new TestItemState(),
        [EMeasurementStatus.INIT_DOWN]: new TestItemState(),
        [EMeasurementStatus.PING]: new TestItemState({
            label: ETestLabels.PING,
        }),
        [EMeasurementStatus.DOWN]: new TestItemState({
            label: ETestLabels.DOWNLOAD,
        }),
        [EMeasurementStatus.INIT_UP]: new TestItemState(),
        [EMeasurementStatus.UP]: new TestItemState({
            label: ETestLabels.UPLOAD,
        }),
        [EMeasurementStatus.SPEEDTEST_END]: new TestItemState(),
        [EMeasurementStatus.SUBMITTING_RESULTS]: new TestItemState(),
        [EMeasurementStatus.END]: new TestItemState(),
        [EMeasurementStatus.SHOWING_RESULTS]: new TestItemState(),
    }
    currentPhaseName: EMeasurementStatus = EMeasurementStatus.NOT_STARTED

    static from(
        initialState: ITestVisualizationState,
        phaseState: IMeasurementPhaseState
    ) {
        const newState = extend<ITestVisualizationState>(initialState)
        if (newState.phases[phaseState.phase]) {
            const newTestItemState = extend<ITestItemState>(
                newState.phases[phaseState.phase],
                phaseState
            )
            newState.phases[phaseState.phase] = newTestItemState
            newState.setCounter(phaseState.phase, newTestItemState)
            newState.extendChart(phaseState.phase)
            newState.setDone(phaseState.phase)
        }
        return newState
    }

    setCounter(
        newPhaseName: EMeasurementStatus,
        newTestItemState: ITestItemState
    ) {
        if (newPhaseName === EMeasurementStatus.DOWN) {
            this.phases[EMeasurementStatus.PING].counter = newTestItemState.ping
            this.phases[EMeasurementStatus.DOWN].counter = newTestItemState.down
        } else if (newPhaseName === EMeasurementStatus.UP) {
            this.phases[EMeasurementStatus.UP].counter = newTestItemState.up
        }
    }

    setDone(newPhaseName: EMeasurementStatus) {
        if (newPhaseName !== this.currentPhaseName) {
            this.phases[this.currentPhaseName].progress = 1
            this.phases[this.currentPhaseName].container = ETestStatuses.DONE
            this.phases[newPhaseName].container = ETestStatuses.ACTIVE
            this.currentPhaseName = newPhaseName
        }
    }

    extendChart(newPhaseName: EMeasurementStatus) {
        const newPhase = this.phases[newPhaseName]
        this.phases[newPhaseName].chart = [
            ...(newPhase?.chart || []),
            {
                x: newPhase.progress * 100,
                y: Math.max(0, newPhase.counter),
            },
        ]
    }
}
