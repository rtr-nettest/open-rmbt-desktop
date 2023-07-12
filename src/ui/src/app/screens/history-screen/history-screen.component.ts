import { Component, HostListener, OnInit } from "@angular/core"
import { ISort } from "src/app/interfaces/sort.interface"
import { ITableColumn } from "src/app/interfaces/table-column.interface"
import { TestStore } from "src/app/store/test.store"
import { ISimpleHistoryResult } from "../../../../../measurement/interfaces/simple-history-result.interface"
import { ERoutes } from "src/app/enums/routes.enum"
import { map, withLatestFrom } from "rxjs/operators"
import { Observable } from "rxjs"
import { TranslocoService } from "@ngneat/transloco"
import { getSignificantDigits } from "src/app/helpers/number"
import { IBasicResponse } from "src/app/interfaces/basic-response.interface"
import { MainStore } from "src/app/store/main.store"

export interface IHistoryRow {
    id: string
    count: number
    time: string
    download: string
    upload: string
    ping: string
    details: string
}

@Component({
    selector: "app-history-screen",
    templateUrl: "./history-screen.component.html",
    styleUrls: ["./history-screen.component.scss"],
})
export class HistoryScreenComponent implements OnInit {
    columns: ITableColumn<ISimpleHistoryResult>[] = [
        {
            columnDef: "count",
            header: "#",
        },
        {
            columnDef: "time",
            header: "Time",
        },
        {
            columnDef: "download",
            header: "Download",
        },
        {
            columnDef: "upload",
            header: "Upload",
        },
        {
            columnDef: "ping",
            header: "Ping",
        },
        {
            columnDef: "details",
            header: "",
            link: (id) => "/" + ERoutes.TEST_RESULT.replace(":testUuid", id),
            transformValue: () => this.transloco.translate("Details..."),
        },
    ]
    error$ = this.mainStore.error$
    loading = false
    observer?: IntersectionObserver
    result$: Observable<IBasicResponse<IHistoryRow>> = this.store.history$.pipe(
        withLatestFrom(
            this.transloco.selectTranslation(),
            this.store.historyPaginator$
        ),
        map(([history, t, paginator]) => {
            if (!history.length) {
                return { content: [], totalElements: 0 }
            }
            const content = history.map((hi, index) => {
                return {
                    id: hi.testUuid!,
                    count: paginator.limit ? index + 1 : history.length - index,
                    time: hi.measurementDate
                        .replace("T", " ")
                        .replace(/\.[0-9]+Z$/, ""),
                    download:
                        getSignificantDigits(hi.downloadKbit / 1e3) +
                        " " +
                        t["Mbps"],
                    upload:
                        getSignificantDigits(hi.uploadKbit / 1e3) +
                        " " +
                        t["Mbps"],
                    ping: hi.ping + " " + t["ms"],
                    details: t["Details"] + "...",
                }
            })
            return {
                content,
                totalElements: content.length,
            }
        })
    )
    sort: ISort = {
        active: "time",
        direction: "desc",
    }

    constructor(
        private mainStore: MainStore,
        private store: TestStore,
        private transloco: TranslocoService
    ) {}

    ngOnInit(): void {
        this.store.allHistoryLoaded$.next(false)
        this.loadMore()
    }

    loadMore() {
        if (this.loading || this.store.allHistoryLoaded$.value) {
            return
        }
        this.loading = true
        this.store
            .getMeasurementHistory()
            .subscribe(() => (this.loading = false))
    }

    @HostListener("document:mousewheel")
    onScroll() {
        const body = document.querySelector("app-main-content")
        if (!body) {
            return
        }
        const bodyBottom = body.getBoundingClientRect().bottom
        if (bodyBottom <= window.innerHeight * 2) {
            this.loadMore()
        }
    }
}
