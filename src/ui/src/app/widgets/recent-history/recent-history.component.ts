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
    IHistoryRowONT,
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
})
export class RecentHistoryComponent implements OnChanges {
    @Input({ required: true }) result!: {
        content: IHistoryRowONT[] | IHistoryRowRTR[]
        totalElements: number
    }
    @Input() grouped?: boolean
    @Input() title?: string
    @Input() excludeColumns?: string[]
    @Input() interruptsTests = false
    @Output() sortChange: EventEmitter<ISort> = new EventEmitter()
    columns$: Observable<ITableColumn<IHistoryRowRTR | IHistoryRowONT>[]> =
        this.mainStore.env$.pipe(
            map((env) => {
                let cols: ITableColumn<IHistoryRowRTR | IHistoryRowONT>[] = []
                if (env?.FLAVOR === "ont") {
                    cols = [
                        {
                            columnDef: "measurementDate",
                            header: "history.table.date",
                            isSortable: true,
                            link: (id) =>
                                "/" +
                                ERoutes.TEST_RESULT.replace(":testUuid", id),
                        },
                        {
                            columnDef: "time",
                            header: "history.table.time",
                        },
                        {
                            columnDef: "providerName",
                            header: "test.provider",
                        },
                        {
                            columnDef: "download",
                            isSortable: true,
                            header: "history.table.download",
                            justify: "flex-end",
                        },
                        {
                            columnDef: "upload",
                            isSortable: true,
                            header: "history.table.upload",
                            justify: "flex-end",
                        },
                        {
                            columnDef: "ping",
                            isSortable: true,
                            header: "history.table.ping",
                            justify: "flex-end",
                        },
                    ]
                } else {
                    cols = [
                        {
                            columnDef: "count",
                            header: "#",
                            transformValue(value) {
                                return value.groupHeader ? "" : value.count
                            },
                        },
                        {
                            columnDef: "measurementDate",
                            header: "Time",
                        },
                        {
                            columnDef: "download",
                            header: "Download",
                            isHtml: true,
                        },
                        {
                            columnDef: "upload",
                            header: "Upload",
                            isHtml: true,
                        },
                        {
                            columnDef: "ping",
                            header: "Ping",
                            isHtml: true,
                        },
                        {
                            columnDef: "details",
                            header: "",
                            isComponent: true,
                        },
                    ]
                }
                return cols.filter(
                    (c) => !this.excludeColumns?.includes(c.columnDef)
                )
            })
        )
    env$ = this.mainStore.env$.pipe(
        map((env) => {
            if (env?.FLAVOR === "ont") {
                this.tableClassNames = ["app-table--ont"]
            }
            return env
        })
    )

    sort$ = this.store.historySort$
    tableClassNames?: string[]
    freshlyLoaded = true

    constructor(
        private mainStore: MainStore,
        private message: MessageService,
        private router: Router,
        private store: HistoryStore,
        private testStore: TestStore
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
                    "/" + ERoutes.TEST_RESULT.replace(":testUuid", loopUuid)
                )
            }
            if (this.interruptsTests) {
                this.message.openConfirmDialog(
                    THIS_INTERRUPTS_ACTION,
                    navFunc,
                    {
                        canCancel: true,
                    }
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
