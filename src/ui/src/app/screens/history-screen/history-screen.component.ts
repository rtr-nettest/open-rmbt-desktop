import {
    AfterViewChecked,
    ChangeDetectorRef,
    Component,
    HostListener,
    Input,
    OnDestroy,
    OnInit,
    ChangeDetectionStrategy,
} from "@angular/core"
import { ISort } from "src/app/interfaces/sort.interface"
import { Observable } from "rxjs"
import { I18nService } from "src/app/services/i18n.service"
import { IBasicResponse } from "src/app/interfaces/basic-response.interface"
import { MainStore } from "src/app/store/main.store"
import { IMainMenuItem } from "src/app/interfaces/main-menu-item.interface"
import { BaseScreen } from "../base-screen/base-screen.component"
import { MessageService } from "src/app/services/message.service"
import { HistoryStore } from "src/app/store/history.store"
import { IHistoryRowRTR } from "src/app/interfaces/history-row.interface"
import { HistoryExportService } from "src/app/services/history-export.service"

@Component({
    selector: "app-history-screen",
    templateUrl: "./history-screen.component.html",
    styleUrls: ["./history-screen.component.scss"],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false,
})
export class HistoryScreenComponent
    extends BaseScreen
    implements OnInit, OnDestroy, AfterViewChecked
{
    @Input() hideMenu = false
    env$ = this.mainStore.env$
    shouldGroupHistory = true
    // Show the "failed tests" filter toggle. Only the history overview has it;
    // the loop-result screen (which reuses this template) switches it off.
    showHistoryFilter = true
    // Toggle state mirror. Off (default) = only completed measurements.
    includeFailed = false
    // The certified result screen (which reuses this template) shows a completion
    // notice plus a clickable PDF logo above the results; the history overview
    // does not.
    showCertifiedResultInfo = false
    loading = false
    allLoaded = false
    isLodaMoreButtonVisible = !!this.mainStore.env$.value?.HISTORY_RESULTS_LIMIT
    actionButtons: IMainMenuItem[] = [
        {
            label: "Export as CSV",
            translations: [],
            icon: "filetype-csv",
            action: () =>
                this.exporter.exportAs("csv", this.store.history$.value),
        },
        {
            label: "Export as PDF",
            translations: [],
            icon: "filetype-pdf",
            action: () =>
                this.exporter.slowPdfExport(this.store.history$.value),
        },
        {
            label: "Export as XLSX",
            translations: [],
            icon: "filetype-xlsx",
            action: () =>
                this.exporter.exportAs("xlsx", this.store.history$.value),
        },
    ]
    pageTitle = "History"
    result$: Observable<IBasicResponse<IHistoryRowRTR>> =
        this.store.getFormattedHistory({ grouped: this.shouldGroupHistory })

    constructor(
        mainStore: MainStore,
        message: MessageService,
        protected exporter: HistoryExportService,
        protected store: HistoryStore,
        private cdr: ChangeDetectorRef,
        private transloco: I18nService,
    ) {
        super(mainStore, message)
    }

    ngAfterViewChecked(): void {
        this.cdr.detectChanges()
    }

    ngOnInit(): void {
        this.allLoaded = false
        // Start from a clean slate. getMeasurementHistory() APPENDS pages, and
        // history$ may still hold entries another screen left behind (e.g. the
        // loop test screen's recent-history), which would otherwise be shown
        // again here — making a single loop test appear twice.
        this.store.resetMeasurementHistory()
        this.loadMore()
    }

    onToggleChange(includeFailed: boolean) {
        this.includeFailed = includeFailed
        // Re-fetch from scratch with the new filter.
        this.allLoaded = false
        this.store.resetMeasurementHistory()
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
            `history.table.heading-${count === 1 ? 1 : 2}`,
        )
        return `${count || 0} ${heading}`
    }

    loadMore() {
        if (this.loading || this.allLoaded) {
            return
        }
        this.loading = true
        const countBefore = this.store.history$.value.length
        this.store.getMeasurementHistory(this.includeFailed).subscribe((history) => {
            this.loading = false
            const limit = this.mainStore.env$.value?.HISTORY_RESULTS_LIMIT ?? 0
            // Nothing more to load when: the page was short/empty, there is no
            // paging limit, or the fetch added no new rows (the accumulated,
            // de-duplicated history did not grow — e.g. the total is an exact
            // multiple of the limit, or the end-of-list DB fallback returned
            // only rows already shown).
            const countAfter = this.store.history$.value.length
            if (
                !history ||
                !history.length ||
                !limit ||
                history.length < limit ||
                countAfter === countBefore
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
