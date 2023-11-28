import {
    AfterViewChecked,
    ChangeDetectorRef,
    Component,
    HostListener,
    OnDestroy,
    OnInit,
} from "@angular/core"
import { ISort } from "src/app/interfaces/sort.interface"
import { Observable } from "rxjs"
import { TranslocoService } from "@ngneat/transloco"
import { IBasicResponse } from "src/app/interfaces/basic-response.interface"
import { MainStore } from "src/app/store/main.store"
import { IMainMenuItem } from "src/app/interfaces/main-menu-item.interface"
import { BaseScreen } from "../base-screen/base-screen.component"
import { MessageService } from "src/app/services/message.service"
import { HistoryStore } from "src/app/store/history.store"
import {
    IHistoryRowONT,
    IHistoryRowRTR,
} from "src/app/interfaces/history-row.interface"

@Component({
    selector: "app-history-screen",
    templateUrl: "./history-screen.component.html",
    styleUrls: ["./history-screen.component.scss"],
})
export class HistoryScreenComponent
    extends BaseScreen
    implements OnInit, OnDestroy, AfterViewChecked
{
    env$ = this.mainStore.env$
    shouldGroupHistory = true
    loading = false
    allLoaded = false
    isLodaMoreButtonVisible = !!this.mainStore.env$.value?.HISTORY_RESULTS_LIMIT
    actionButtons: IMainMenuItem[] = [
        {
            label: "Export as CSV",
            translations: [],
            icon: "filetype-csv",
            action: () => this.store.exportAs("csv", this.store.history$.value),
        },
        {
            label: "Export as PDF",
            translations: [],
            icon: "filetype-pdf",
            action: () => this.store.exportAsPdf(this.store.history$.value),
        },
        {
            label: "Export as XLSX",
            translations: [],
            icon: "filetype-xlsx",
            action: () =>
                this.store.exportAs("xlsx", this.store.history$.value),
        },
    ]
    pageTitle = "History"
    result$: Observable<IBasicResponse<IHistoryRowRTR | IHistoryRowONT>> =
        this.store.getFormattedHistory({ grouped: this.shouldGroupHistory })

    constructor(
        mainStore: MainStore,
        message: MessageService,
        protected store: HistoryStore,
        private cdr: ChangeDetectorRef,
        private transloco: TranslocoService
    ) {
        super(mainStore, message)
    }

    ngAfterViewChecked(): void {
        this.cdr.detectChanges()
    }

    ngOnInit(): void {
        this.allLoaded = false
        this.loadMore()
    }

    override ngOnDestroy(): void {
        this.store.resetMeasurementHistory()
        super.ngOnDestroy()
    }

    changeSort = (sort: ISort) => {
        this.allLoaded = false
        this.store.sortMeasurementHistory(sort, this.loadMore.bind(this))
    }

    getHeading(count: number) {
        const heading = this.transloco.translate(
            `history.table.heading-${count === 1 ? 1 : 2}`
        )
        return `${count || 0} ${heading}`
    }

    loadMore() {
        if (this.loading || this.allLoaded) {
            return
        }
        this.loading = true
        this.store.getMeasurementHistory().subscribe((history) => {
            this.loading = false
            const limit = this.mainStore.env$.value?.HISTORY_RESULTS_LIMIT ?? 0
            if (
                !history ||
                !history.length ||
                !limit ||
                history.length < limit
            ) {
                this.allLoaded = true
            }
        })
    }

    @HostListener("body:scroll")
    onScroll() {
        const body = document.querySelector("app-main-content")
        if (!body || !this.mainStore.env$.value?.HISTORY_RESULTS_LIMIT) {
            return
        }
        const bodyBottom = body.getBoundingClientRect().bottom
        if (bodyBottom <= window.innerHeight * 2) {
            this.loadMore()
        }
    }
}
