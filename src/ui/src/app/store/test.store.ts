import { Injectable, NgZone } from "@angular/core"
import {
    BehaviorSubject,
    concatMap,
    from,
    interval,
    map,
    of,
    takeWhile,
} from "rxjs"
import { TestVisualizationState } from "../dto/test-visualization-state.dto"
import { ITestVisualizationState } from "../interfaces/test-visualization-state.interface"
import { IBasicNetworkInfo } from "../../../../measurement/interfaces/basic-network-info.interface"
import { BasicNetworkInfo } from "../dto/basic-network-info.dto"
import { ISimpleHistoryResult } from "../../../../measurement/interfaces/simple-history-result.interface"
import { TestPhaseState } from "../dto/test-phase-state.dto"
import { EMeasurementStatus } from "../../../../measurement/enums/measurement-status.enum"
import { Router } from "@angular/router"
import { MainStore } from "./main.store"
import { IMeasurementServerResponse } from "../../../../measurement/interfaces/measurement-server-response.interface"
import { ERoutes } from "../enums/routes.enum"
import { ILoopModeInfo } from "../../../../measurement/interfaces/measurement-registration-request.interface"
import { v4 } from "uuid"
import { MessageService } from "../services/message.service"
import { TranslocoService } from "@ngneat/transloco"
import { SprintfPipe } from "../pipes/sprintf.pipe"
import { IMeasurementPhaseState } from "../../../../measurement/interfaces/measurement-phase-state.interface"
import { HistoryStore } from "./history.store"

export const STATE_UPDATE_TIMEOUT = 200

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
    servers$ = new BehaviorSubject<IMeasurementServerResponse[]>([])
    testIntervalMinutes$ = new BehaviorSubject<number | null>(null)
    enableLoopMode$ = new BehaviorSubject<boolean>(false)
    loopCounter$ = new BehaviorSubject<number>(1)
    loopUuid$ = new BehaviorSubject<string | null>(null)

    get fullTestIntervalMs() {
        return this.testIntervalMinutes$.value! * 60 * 1000
    }

    constructor(
        private historyStore: HistoryStore,
        private message: MessageService,
        private mainStore: MainStore,
        private ngZone: NgZone,
        private router: Router,
        private sprintf: SprintfPipe,
        private transloco: TranslocoService
    ) {
        window.electronAPI.onRestartMeasurement((loopCounter) => {
            this.ngZone.run(() => {
                this.loopCounter$.next(loopCounter)
            })
        })
        window.electronAPI.onLoopModeExpired(() => {
            this.ngZone.run(() => {
                const message = this.transloco.translate(
                    "The loop measurement has expired"
                )
                this.message.openConfirmDialog(
                    this.sprintf.transform(
                        message,
                        this.mainStore.env$.value!.LOOP_MODE_MAX_DURATION
                    ),
                    () => {
                        this.router.navigate([
                            "/",
                            ERoutes.LOOP_RESULT.split("/")[0],
                            this.loopUuid$.value,
                        ])
                    }
                )
            })
        })

        window.addEventListener("focus", this.setLatestTestState)
    }

    launchTest() {
        this.resetState()
        if (!this.enableLoopMode$.value) {
            window.electronAPI.runMeasurement()
        }
        return interval(STATE_UPDATE_TIMEOUT).pipe(
            concatMap(() => from(window.electronAPI.getMeasurementState())),
            map(this.setTestState)
        )
    }

    private setTestState = (
        phaseState: IMeasurementPhaseState & IBasicNetworkInfo
    ) => {
        let oldState = this.visualization$.value
        if (
            (oldState.currentPhaseName === EMeasurementStatus.END ||
                oldState.currentPhaseName === EMeasurementStatus.ERROR) &&
            phaseState.phase !== oldState.currentPhaseName
        ) {
            oldState = new TestVisualizationState()
        }
        const newState = TestVisualizationState.from(
            oldState,
            phaseState,
            this.mainStore.env$.value?.FLAVOR ?? "rtr"
        )
        this.visualization$.next(newState)
        this.basicNetworkInfo$.next(phaseState)
        return newState
    }

    launchLoopTest(interval: number) {
        const loopUuid = v4()
        const loopCounter = 1
        this.loopUuid$.next(loopUuid)
        this.loopCounter$.next(loopCounter)
        this.enableLoopMode$.next(true)
        this.testIntervalMinutes$.next(interval)
        const loopModeInfo: ILoopModeInfo | undefined = {
            max_delay: this.testIntervalMinutes$.value ?? 0,
            test_counter: loopCounter,
            loop_uuid: loopUuid,
        }
        window.electronAPI.scheduleLoop(this.fullTestIntervalMs, loopModeInfo)
        this.router.navigate(["/", ERoutes.LOOP_TEST])
    }

    private setLatestTestState = () => {
        if (
            this.mainStore.env$.value?.FLAVOR === "ont" ||
            this.visualization$.value.currentPhaseName ===
                EMeasurementStatus.SHOWING_RESULTS
        ) {
            return
        }
        window.electronAPI.getMeasurementState().then((state) => {
            this.setTestState(state)
            const phases = Object.values(EMeasurementStatus)
            const v = this.visualization$.value
            for (const phase of phases) {
                if (!v.phases[phase]) {
                    continue
                }
                v.phases[phase].ping = state.ping
                v.phases[phase].down = state.down
                v.phases[phase].up = state.up
            }
            v.phases[EMeasurementStatus.DOWN].setChartFromPings?.(state.pings)
            v.phases[EMeasurementStatus.DOWN].setRTRChartFromOverallSpeed?.(
                state.downs
            )
            v.phases[EMeasurementStatus.UP].setRTRChartFromOverallSpeed?.(
                state.ups
            )
            this.visualization$.next(v)
            this.historyStore
                .getRecentMeasurementHistory({
                    offset: 0,
                    limit: this.loopCounter$.value - 1,
                })
                .subscribe()
        })
    }

    disableLoopMode() {
        this.enableLoopMode$.next(false)
        this.loopCounter$.next(1)
    }

    getMeasurementResult(testUuid: string | null) {
        if (!testUuid || this.mainStore.error$.value) {
            return of(null)
        }
        return from(window.electronAPI.getMeasurementResult(testUuid)).pipe(
            map((result) => {
                this.simpleHistoryResult$.next(result)
                const newPhase = new TestPhaseState({
                    phase: EMeasurementStatus.SHOWING_RESULTS,
                    down: result.downloadKbit / 1000,
                    up: result.uploadKbit / 1000,
                    ping: result.ping / 1e6,
                })
                const newState = TestVisualizationState.fromHistoryResult(
                    result,
                    this.visualization$.value,
                    newPhase,
                    this.mainStore.env$.value?.FLAVOR ?? "rtr"
                )
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

    getServers() {
        window.electronAPI.getServers().then((servers) => {
            this.servers$.next(servers)
        })
    }

    setActiveServer(server: IMeasurementServerResponse | null) {
        window.electronAPI.setActiveServer(server)
        const updatedServers = this.servers$.value.map((s) =>
            s.webAddress === server?.webAddress
                ? { ...s, active: true }
                : { ...s, active: false }
        )
        this.servers$.next(updatedServers)
    }

    private resetState() {
        this.basicNetworkInfo$.next(new BasicNetworkInfo())
        this.visualization$.next(new TestVisualizationState())
        this.simpleHistoryResult$.next(null)
        this.mainStore.error$.next(null)
    }
}
