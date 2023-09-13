import {
    AfterViewChecked,
    ChangeDetectorRef,
    Component,
    HostListener,
    OnDestroy,
    OnInit,
} from "@angular/core"
import { ISort } from "src/app/interfaces/sort.interface"
import { ITableColumn } from "src/app/interfaces/table-column.interface"
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
import { DatePipe } from "@angular/common"
import { IEnv } from "../../../../../electron/interfaces/env.interface"
import { HistoryStore } from "src/app/store/history.store"

export interface IHistoryRowRTR {
    id: string
    count: number
    measurementDate: string
    download: string
    upload: string
    ping: string
    details: string
}

export interface IHistoryRowONT {
    id: string
    measurementDate: string
    time: string
    providerName: string
    download: string
    upload: string
    ping: string
}

@Component({
    selector: "app-history-screen",
    templateUrl: "./history-screen.component.html",
    styleUrls: ["./history-screen.component.scss"],
})
export class HistoryScreenComponent
    extends BaseScreen
    implements OnInit, OnDestroy, AfterViewChecked
{
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
    loading = false
    allLoaded = false
    isLodaMoreButtonVisible = !!this.mainStore.env$.value?.HISTORY_RESULTS_LIMIT
    result$: Observable<IBasicResponse<IHistoryRowRTR | IHistoryRowONT>> =
        this.store.history$.pipe(
            withLatestFrom(
                this.transloco.selectTranslation(),
                this.store.historyPaginator$,
                this.mainStore.env$
            ),
            map(([history, t, paginator, env]) => {
                this.env = env ?? undefined
                if (this.env?.FLAVOR === "ont") {
                    this.tableClassNames = ["app-table--ont"]
                }
                if (!history.length) {
                    return { content: [], totalElements: 0 }
                }
                const content =
                    env?.FLAVOR === "ont"
                        ? history.map(
                              this.historyItemToRowONT(
                                  t,
                                  paginator,
                                  history.length
                              )
                          )
                        : history.map(
                              this.historyItemToRowRTR(
                                  t,
                                  paginator,
                                  history.length
                              )
                          )
                const totalElements = history[0].paginator?.totalElements
                return {
                    content,
                    totalElements:
                        env?.FLAVOR === "ont" && totalElements
                            ? totalElements
                            : content.length,
                }
            })
        )
    sort$ = this.store.historySort$
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
    env?: IEnv
    tableClassNames?: string[]

    constructor(
        mainStore: MainStore,
        message: MessageService,
        private cdr: ChangeDetectorRef,
        private classification: ClassificationService,
        private conversion: ConversionService,
        private store: HistoryStore,
        private transloco: TranslocoService,
        private datePipe: DatePipe
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

    private historyItemToRowONT =
        (t: Translation, paginator: IPaginator, historyLength: number) =>
        (hi: ISimpleHistoryResult, index: number): IHistoryRowONT => {
            const locale = this.transloco.getActiveLang()
            return {
                id: hi.testUuid!,
                measurementDate: this.datePipe.transform(
                    hi.measurementDate,
                    "mediumDate",
                    undefined,
                    locale
                )!,
                time: this.datePipe.transform(
                    hi.measurementDate,
                    "mediumTime",
                    undefined,
                    locale
                )!,
                download: this.conversion
                    .getSignificantDigits(hi.downloadKbit / 1e3)
                    .toLocaleString(locale),
                upload: this.conversion
                    .getSignificantDigits(hi.uploadKbit / 1e3)
                    .toLocaleString(locale),
                ping: this.conversion
                    .getSignificantDigits(hi.ping)
                    .toLocaleString(locale),
                providerName: hi.providerName,
            }
        }

    private historyItemToRowRTR =
        (t: Translation, paginator: IPaginator, historyLength: number) =>
        (hi: ISimpleHistoryResult, index: number): IHistoryRowRTR => {
            const locale = this.transloco.getActiveLang()
            return {
                id: hi.testUuid!,
                count: paginator.limit ? index + 1 : historyLength - index,
                measurementDate: this.datePipe.transform(
                    hi.measurementDate,
                    "medium",
                    undefined,
                    locale
                )!,
                download:
                    this.classification.getIconByClass(hi.downloadClass) +
                    this.conversion
                        .getSignificantDigits(hi.downloadKbit / 1e3)
                        .toLocaleString(locale) +
                    " " +
                    t["Mbps"],
                upload:
                    this.classification.getIconByClass(hi.uploadClass) +
                    this.conversion
                        .getSignificantDigits(hi.uploadKbit / 1e3)
                        .toLocaleString(locale) +
                    " " +
                    t["Mbps"],
                ping:
                    this.classification.getIconByClass(hi.pingClass) +
                    hi.ping.toLocaleString(locale) +
                    " " +
                    t["ms"],
                details: t["Details"] + "...",
            }
        }
}
