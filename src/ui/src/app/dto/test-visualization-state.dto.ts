import { ITestVisualizationState } from "../interfaces/test-visualization-state.interface"
import { ITestPhaseState } from "../interfaces/test-phase-state.interface"
import { EMeasurementStatus } from "../../../../measurement/enums/measurement-status.enum"
import { IMeasurementPhaseState } from "../../../../measurement/interfaces/measurement-phase-state.interface"
import { extend } from "../helpers/extend"
import { TestPhaseState } from "./test-phase-state.dto"
import { ETestStatuses } from "../enums/test-statuses.enum"
import { ETestLabels } from "../enums/test-labels.enum"
import { ISimpleHistoryResult } from "../../../../measurement/interfaces/simple-history-result.interface"

export class TestVisualizationState implements ITestVisualizationState {
    flavor: string = "rtr"
    phases: {
        [key: string]: ITestPhaseState
    } = {
        [EMeasurementStatus.NOT_STARTED]: new TestPhaseState(),
        [EMeasurementStatus.WAIT]: new TestPhaseState(),
        [EMeasurementStatus.INIT]: new TestPhaseState(),
        [EMeasurementStatus.INIT_DOWN]: new TestPhaseState(),
        [EMeasurementStatus.PING]: new TestPhaseState({
            label: ETestLabels.PING,
        }),
        [EMeasurementStatus.DOWN]: new TestPhaseState({
            label: ETestLabels.DOWNLOAD,
        }),
        [EMeasurementStatus.INIT_UP]: new TestPhaseState(),
        [EMeasurementStatus.UP]: new TestPhaseState({
            label: ETestLabels.UPLOAD,
        }),
        [EMeasurementStatus.SPEEDTEST_END]: new TestPhaseState(),
        [EMeasurementStatus.SUBMITTING_RESULTS]: new TestPhaseState(),
        [EMeasurementStatus.END]: new TestPhaseState(),
        [EMeasurementStatus.SHOWING_RESULTS]: new TestPhaseState(),
        [EMeasurementStatus.ERROR]: new TestPhaseState(),
    }
    currentPhaseName: EMeasurementStatus = EMeasurementStatus.NOT_STARTED

    get startTimeMs() {
        return this.phases[this.currentPhaseName].startTimeMs
    }

    get endTimeMs() {
        return this.phases[this.currentPhaseName].endTimeMs
    }

    static from(
        initialState: ITestVisualizationState,
        phaseState: IMeasurementPhaseState,
        flavor: string
    ) {
        const newState = extend<ITestVisualizationState>(initialState)
        if (newState.phases[phaseState.phase]) {
            const newTestPhaseState = extend<ITestPhaseState>(
                newState.phases[phaseState.phase],
                phaseState
            )
            newState.flavor = flavor
            newState.phases[phaseState.phase] = newTestPhaseState
            newState.setCounter(phaseState.phase, newTestPhaseState)
            newState.extendChart(phaseState.phase)
            newState.setDone(phaseState.phase)
        }
        return newState
    }

    static fromHistoryResult(
        result: ISimpleHistoryResult,
        initialState: ITestVisualizationState,
        phaseState: IMeasurementPhaseState,
        flavor: string
    ) {
        const newState = TestVisualizationState.from(
            initialState,
            phaseState,
            flavor
        )
        if (flavor !== "rtr") {
            newState.phases[
                EMeasurementStatus.DOWN
            ].setONTChartFromOverallSpeed?.(result.downloadOverTime ?? [])
            newState.phases[
                EMeasurementStatus.UP
            ].setONTChartFromOverallSpeed?.(result.uploadOverTime ?? [])
        } else {
            newState.phases[
                EMeasurementStatus.DOWN
            ].setRTRChartFromOverallSpeed?.(result.downloadOverTime ?? [])
            newState.phases[
                EMeasurementStatus.UP
            ].setRTRChartFromOverallSpeed?.(result.uploadOverTime ?? [])
        }
        newState.phases[EMeasurementStatus.PING].setChartFromPings?.(
            result.pingOverTime ?? []
        )
        return newState
    }

    setCounter(
        newPhaseName: EMeasurementStatus,
        newTestPhaseState: ITestPhaseState
    ) {
        if (newPhaseName === EMeasurementStatus.DOWN) {
            if (
                this.phases[EMeasurementStatus.PING].counter !==
                newTestPhaseState.ping
            ) {
                this.phases[EMeasurementStatus.PING].counter =
                    newTestPhaseState.ping
                this.phases[EMeasurementStatus.PING].setChartFromPings?.(
                    newTestPhaseState.pings
                )
            }
            this.phases[EMeasurementStatus.DOWN].counter =
                newTestPhaseState.down
        } else if (
            newPhaseName === EMeasurementStatus.INIT_UP ||
            newPhaseName === EMeasurementStatus.UP ||
            newPhaseName === EMeasurementStatus.SUBMITTING_RESULTS ||
            newPhaseName === EMeasurementStatus.SHOWING_RESULTS
        ) {
            this.phases[EMeasurementStatus.PING].counter =
                newTestPhaseState.ping
            this.phases[EMeasurementStatus.DOWN].counter =
                newTestPhaseState.down
            this.phases[EMeasurementStatus.UP].counter = newTestPhaseState.up
        }
        this.setResultsForEachPhase(newTestPhaseState)
    }

    private setResultsForEachPhase(newTestPhaseState: ITestPhaseState) {
        const phases = Object.values(EMeasurementStatus)
        for (const phase of phases) {
            if (!this.phases[phase]) {
                continue
            }
            this.phases[phase].ping = newTestPhaseState.ping
            this.phases[phase].down = newTestPhaseState.down
            this.phases[phase].up = newTestPhaseState.up
        }
    }

    setDone(newPhaseName: EMeasurementStatus) {
        if (newPhaseName === EMeasurementStatus.SHOWING_RESULTS) {
            const containerPhases = [
                EMeasurementStatus.DOWN,
                EMeasurementStatus.UP,
                EMeasurementStatus.PING,
            ]
            for (const phase of containerPhases) {
                this.phases[phase].progress = 1
                this.phases[phase].container = ETestStatuses.DONE
            }
        } else if (newPhaseName !== this.currentPhaseName) {
            this.phases[this.currentPhaseName].progress = 1
            this.phases[this.currentPhaseName].container = ETestStatuses.DONE
            this.phases[newPhaseName].container = ETestStatuses.ACTIVE
        }
        this.currentPhaseName = newPhaseName
    }

    extendChart(newPhaseName: EMeasurementStatus) {
        const newPhase = this.phases[newPhaseName]
        if (this.flavor !== "rtr") {
            newPhase.extendONTSpeedChart()
        } else {
            newPhase.extendRTRSpeedChart()
        }
    }
}
