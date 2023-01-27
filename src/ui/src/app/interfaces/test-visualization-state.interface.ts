import { EMeasurementStatus } from "../../../../measurement/enums/measurement-status.enum"
import { ITestPhaseState } from "./test-phase-state.interface"

export interface ITestVisualizationState {
    phases: {
        [key: string]: ITestPhaseState
    }
    currentPhaseName: EMeasurementStatus

    setCounter(
        newPhase: EMeasurementStatus,
        newTestPhaseState: ITestPhaseState
    ): void

    setDone(newPhase: EMeasurementStatus): void

    extendChart(newPhase: EMeasurementStatus): void
}
