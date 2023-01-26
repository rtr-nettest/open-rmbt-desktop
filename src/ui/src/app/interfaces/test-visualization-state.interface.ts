import { EMeasurementStatus } from "../../../../measurement/enums/measurement-status.enum"
import { ITestItemState } from "./test-item-state.interface"

export interface ITestVisualizationState {
    phases: {
        [key: string]: ITestItemState
    }
    currentPhaseName: EMeasurementStatus

    setCounter(
        newPhase: EMeasurementStatus,
        newTestItemState: ITestItemState
    ): void

    setDone(newPhase: EMeasurementStatus): void

    extendChart(newPhase: EMeasurementStatus): void
}
