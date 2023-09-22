import { Component, EventEmitter, Output } from "@angular/core"
import { Observable, map, tap, withLatestFrom } from "rxjs"
import { ITableColumn } from "src/app/interfaces/table-column.interface"
import { ISimpleHistoryResult } from "../../../../../measurement/interfaces/simple-history-result.interface"
import { ERoutes } from "src/app/enums/routes.enum"
import { MainStore } from "src/app/store/main.store"
import { Translation, TranslocoService } from "@ngneat/transloco"
import { ISort } from "src/app/interfaces/sort.interface"
import { HistoryStore } from "src/app/store/history.store"
import {
    IHistoryRowONT,
    IHistoryRowRTR,
} from "src/app/interfaces/history-row.interface"
import { IBasicResponse } from "src/app/interfaces/basic-response.interface"
import { IPaginator } from "src/app/interfaces/paginator.interface"
import { ClassificationService } from "src/app/services/classification.service"
import { ConversionService } from "src/app/services/conversion.service"
import { DatePipe } from "@angular/common"
import { IEnv } from "../../../../../electron/interfaces/env.interface"

@Component({
    selector: "app-recent-history",
    templateUrl: "./recent-history.component.html",
    styleUrls: ["./recent-history.component.scss"],
})
export class RecentHistoryComponent {
    @Output() sortChange: EventEmitter<ISort> = new EventEmitter()
    columns$: Observable<ITableColumn<ISimpleHistoryResult>[]> =
        this.mainStore.env$.pipe(
            map((env) => {
                if (env?.FLAVOR === "ont") {
                    return [
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
                    return [
                        {
                            columnDef: "count",
                            header: "#",
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
                            link: (id) =>
                                "/" +
                                ERoutes.TEST_RESULT.replace(":testUuid", id),
                            transformValue: () =>
                                this.transloco.translate("Details..."),
                        },
                    ]
                }
            })
        )
    env?: IEnv

    result$: Observable<IBasicResponse<IHistoryRowRTR | IHistoryRowONT>> =
        this.store.formattedHistory$.pipe(
            withLatestFrom(this.mainStore.env$),
            map(([history, env]) => {
                this.env = env ?? undefined
                if (this.env?.FLAVOR === "ont") {
                    this.tableClassNames = ["app-table--ont"]
                }
                return history
            })
        )
    sort$ = this.store.historySort$
    tableClassNames?: string[]

    constructor(
        private mainStore: MainStore,
        private store: HistoryStore,
        private transloco: TranslocoService
    ) {}

    changeSort = (sort: ISort) => {
        this.sortChange.emit(sort)
    }
}
