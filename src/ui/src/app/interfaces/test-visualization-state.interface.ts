import { EMeasurementStatus } from "../../../../measurement/enums/measurement-status.enum"
import { ITestItemState } from "./test-item-state.interface"

export interface ITestVisualizationState {
    phases: {
        [key: string]: ITestItemState
    }
    currentPhase: EMeasurementStatus

    extendChart?(
        key: "download" | "upload",
        counter: string | number,
        progress: number
    ): { x: number; y: number }[]
}
