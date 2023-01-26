import { EMeasurementStatus } from "../../../../measurement/enums/measurement-status.enum"
import { ETestStatuses } from "../enums/test-statuses.enum"
import { ITestItemState } from "../interfaces/test-item-state.interface"

export class TestItemState implements ITestItemState {
    counter: number = -1
    testUuid: string = ""
    down: number = -1
    up: number = -1
    ping: number = -1
    chart?: { x: number; y: number }[] | undefined
    container?: ETestStatuses | undefined
    duration: number = 0
    progress: number = 0
    phase: EMeasurementStatus = EMeasurementStatus.NOT_STARTED

    constructor(options?: Partial<ITestItemState>) {
        if (options) {
            Object.assign(options)
        }
    }
}
