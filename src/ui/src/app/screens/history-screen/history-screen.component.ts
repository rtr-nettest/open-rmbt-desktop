import {
    ChangeDetectionStrategy,
    Component,
    HostListener,
    OnInit,
} from "@angular/core"
import { ISort } from "src/app/interfaces/sort.interface"
import { ITableColumn } from "src/app/interfaces/table-column.interface"
import { TestStore } from "src/app/store/test.store"
import { ISimpleHistoryResult } from "../../../../../measurement/interfaces/simple-history-result.interface"
import { ERoutes } from "src/app/enums/routes.enum"
import { map, withLatestFrom } from "rxjs/operators"
import { Observable } from "rxjs"
import { Translation, TranslocoService } from "@ngneat/transloco"
import { IBasicResponse } from "src/app/interfaces/basic-response.interface"
import { MainStore } from "src/app/store/main.store"
import { IMainMenuItem } from "src/app/interfaces/main-menu-item.interface"
import { IPaginator } from "src/app/interfaces/paginator.interface"
import { ClassificationService } from "src/app/services/classification.service"
import { ConversionService } from "src/app/services/conversion.service"
import { BaseScreen } from "../base-screen/base-screen.component"
import { MessageService } from "src/app/services/message.service"

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
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistoryScreenComponent extends BaseScreen implements OnInit {
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
            link: (id) => "/" + ERoutes.TEST_RESULT.replace(":testUuid", id),
            transformValue: () => this.transloco.translate("Details..."),
        },
    ]
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
            const content = history.map(this.historyItemToRow(t, paginator))
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
    actionButtons: IMainMenuItem[] = [
        {
            label: "",
            translations: [],
            icon: "filetype-csv",
            action: () => this.store.exportAs("csv", this.store.history$.value),
        },
        {
            label: "",
            translations: [],
            icon: "filetype-pdf",
            action: () => this.store.exportAsPdf(this.store.history$.value),
        },
        {
            label: "",
            translations: [],
            icon: "filetype-xlsx",
            action: () =>
                this.store.exportAs("xlsx", this.store.history$.value),
        },
    ]

    constructor(
        mainStore: MainStore,
        message: MessageService,
        private classification: ClassificationService,
        private conversion: ConversionService,
        private store: TestStore,
        private transloco: TranslocoService
    ) {
        super(mainStore, message)
    }

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

    @HostListener("body:scroll")
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

    private historyItemToRow =
        (t: Translation, paginator: IPaginator) =>
        (hi: ISimpleHistoryResult, index: number) => {
            return {
                id: hi.testUuid!,
                count: paginator.limit ? index + 1 : history.length - index,
                time: hi.measurementDate
                    .replace("T", " ")
                    .replace(/\.[0-9]+Z$/, ""),
                download:
                    this.classification.getIconByClass(hi.downloadClass) +
                    this.conversion.getSignificantDigits(
                        hi.downloadKbit / 1e3
                    ) +
                    " " +
                    t["Mbps"],
                upload:
                    this.classification.getIconByClass(hi.uploadClass) +
                    this.conversion.getSignificantDigits(hi.uploadKbit / 1e3) +
                    " " +
                    t["Mbps"],
                ping:
                    this.classification.getIconByClass(hi.pingClass) +
                    hi.ping +
                    " " +
                    t["ms"],
                details: t["Details"] + "...",
            }
        }
}
