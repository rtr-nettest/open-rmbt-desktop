import {
    Component,
    EventEmitter,
    Input,
    OnChanges,
    Output,
} from "@angular/core"
import { Observable, map } from "rxjs"
import { ITableColumn } from "src/app/interfaces/table-column.interface"
import { ERoutes } from "src/app/enums/routes.enum"
import { MainStore } from "src/app/store/main.store"
import { ISort } from "src/app/interfaces/sort.interface"
import { HistoryStore } from "src/app/store/history.store"
import {
    IHistoryRowRTR,
} from "src/app/interfaces/history-row.interface"
import { Router } from "@angular/router"
import { MessageService } from "src/app/services/message.service"
import { THIS_INTERRUPTS_ACTION } from "src/app/constants/strings"
import { TestStore } from "src/app/store/test.store"

@Component({
    selector: "app-recent-history",
    templateUrl: "./recent-history.component.html",
    styleUrls: ["./recent-history.component.scss"],
    standalone: false,
})
export class RecentHistoryComponent implements OnChanges {
    @Input({ required: true }) result!: {
        content: IHistoryRowRTR[]
        totalElements: number
    }
    @Input() grouped?: boolean
    @Input() title?: string
    @Input() excludeColumns?: string[]
    @Input() interruptsTests = false
    @Output() sortChange: EventEmitter<ISort> = new EventEmitter()
    columns$: Observable<ITableColumn<IHistoryRowRTR>[]> =
        this.mainStore.env$.pipe(
            map(() => {
                const cols = [
                    {
                        columnDef: "measurementDate",
                        header: "Time",
                        isDate: true,
                    },
                    {
                        columnDef: "download",
                        header: "Download",
                        getNgClass: (value) => value.downloadClass,
                    },
                    {
                        columnDef: "upload",
                        header: "Upload",
                        getNgClass: (value) => value.uploadClass,
                    },
                    {
                        columnDef: "ping",
                        header: "Ping",
                        getNgClass: (value) => value.pingClass,
                    },
                    {
                        columnDef: "groupArrowIndicator",
                        header: "",
                    },
                ] as ITableColumn<IHistoryRowRTR>[]
                return cols.filter(
                    (c) => !this.excludeColumns?.includes(c.columnDef),
                )
            }),
        )
    env$ = this.mainStore.env$

    sort$ = this.store.historySort$
    tableClassNames?: string[]
    freshlyLoaded = true

    get expandedElements() {
        return this.store.openLoops$.value
    }

    constructor(
        private mainStore: MainStore,
        private message: MessageService,
        private router: Router,
        private store: HistoryStore,
        private testStore: TestStore,
    ) {}

    ngOnChanges(): void {
        const firstItem = this.result.content[0]
        if (this.grouped && firstItem?.groupHeader && this.freshlyLoaded) {
            this.freshlyLoaded = false
            this.store.openLoops$.next([])
            this.toggleLoopResults(firstItem.id!)
        }
    }

    changeSort = (sort: ISort) => {
        this.sortChange.emit(sort)
    }

    toggleLoopResults(loopUuid: string) {
        if (!loopUuid.startsWith("L")) {
            const navFunc = () => {
                window.electronAPI.abortMeasurement()
                this.testStore.disableLoopMode()
                this.router.navigateByUrl(
                    "/" + ERoutes.TEST_RESULT.replace(":testUuid", loopUuid),
                )
            }
            if (this.interruptsTests) {
                this.message.openConfirmDialog(
                    THIS_INTERRUPTS_ACTION,
                    navFunc,
                    {
                        canCancel: true,
                    },
                )
            } else {
                navFunc()
            }
            return
        }
        const openLoops = this.store.openLoops$.value
        const index = openLoops.indexOf(loopUuid)
        if (index >= 0) {
            openLoops.splice(index, 1)
            this.store.openLoops$.next(openLoops)
        } else {
            this.store.openLoops$.next([...openLoops, loopUuid])
        }
    }
}
