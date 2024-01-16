import { ChangeDetectionStrategy, Component, OnDestroy } from "@angular/core"
import { ActivatedRoute, Router } from "@angular/router"
import { TranslocoService } from "@ngneat/transloco"
import { ITableColumn } from "src/app/interfaces/table-column.interface"
import { MainStore } from "src/app/store/main.store"
import { TestStore } from "src/app/store/test.store"
import { ISimpleHistoryResult } from "../../../../../measurement/interfaces/simple-history-result.interface"
import { IDetailedHistoryResultItem } from "../../../../../measurement/interfaces/detailed-history-result-item.interface"
import { IBasicResponse } from "src/app/interfaces/basic-response.interface"
import { ISort } from "src/app/interfaces/sort.interface"
import { of, tap } from "rxjs"
import { IMainMenuItem } from "src/app/interfaces/main-menu-item.interface"
import { ERoutes } from "src/app/enums/routes.enum"
import { ClassificationService } from "src/app/services/classification.service"
import { ConversionService } from "src/app/services/conversion.service"
import { HistoryStore } from "src/app/store/history.store"
import { UNKNOWN } from "src/app/constants/strings"
import { I18nService } from "src/app/services/i18n.service"

@Component({
    selector: "app-result-screen",
    templateUrl: "./result-screen.component.html",
    styleUrls: ["./result-screen.component.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResultScreenComponent implements OnDestroy {
    columns: ITableColumn[] = [
        {
            columnDef: "title",
            header: "",
        },
        {
            columnDef: "value",
            header: "",
            isHtml: true,
        },
    ]
    env$ = this.mainStore.env$.pipe(
        tap((env) => {
            this.openResultBaseURL =
                env?.OPEN_HISTORY_RESUlT_URL?.replace(
                    "$lang",
                    this.i18n.getActiveBrowserLang()
                ) ?? ""
        })
    )
    error$ = this.mainStore.error$
    openResultBaseURL = ""
    openResultURL = ""
    result$ = this.store.getMeasurementResult(
        this.route.snapshot.paramMap.get("testUuid")
    )
    sort: ISort = {
        active: "",
        direction: "",
    }
    actionButtons: IMainMenuItem[] = [
        {
            label: "Export as PDF",
            translations: [],
            icon: "filetype-pdf",
            action: () =>
                this.historyStore.exportAsPdf([
                    this.store.simpleHistoryResult$.value!,
                ]),
        },
    ]
    locale = this.transloco.getActiveLang()

    constructor(
        private classification: ClassificationService,
        private conversion: ConversionService,
        private historyStore: HistoryStore,
        private i18n: I18nService,
        private mainStore: MainStore,
        private store: TestStore,
        private route: ActivatedRoute,
        private router: Router,
        private transloco: TranslocoService
    ) {}

    ngOnDestroy(): void {
        this.mainStore.error$.next(null)
    }

    getSpeedInMbps(speed: number) {
        const locale = this.transloco.getActiveLang()
        return (
            this.conversion
                .getSignificantDigits(speed / 1e3)
                .toLocaleString(locale) +
            " " +
            this.transloco.translate("Mbps")
        )
    }

    getPingInMs(ping: number) {
        const locale = this.transloco.getActiveLang()
        return (
            this.conversion.getSignificantDigits(ping).toLocaleString(locale) +
            " " +
            this.transloco.translate("ms")
        )
    }

    getBasicResults(
        result: ISimpleHistoryResult
    ): IBasicResponse<IDetailedHistoryResultItem> {
        const content = Object.entries(result).reduce((acc, [key, value]) => {
            switch (key) {
                case "downloadKbit":
                    return [
                        ...acc,
                        {
                            title: "Download",
                            value:
                                this.classification.getPhaseIconByClass(
                                    "down",
                                    result.downloadClass
                                ) + this.getSpeedInMbps(value),
                        },
                    ]
                case "uploadKbit":
                    return [
                        ...acc,
                        {
                            title: "Upload",
                            value:
                                this.classification.getPhaseIconByClass(
                                    "up",
                                    result.uploadClass
                                ) + this.getSpeedInMbps(value),
                        },
                    ]
                case "ping":
                    return [
                        ...acc,
                        {
                            title: "Ping",
                            value:
                                this.classification.getPhaseIconByClass(
                                    "ping",
                                    result.pingClass
                                ) + this.getPingInMs(value),
                        },
                    ]
                default:
                    return acc
            }
        }, [] as IDetailedHistoryResultItem[])
        return {
            content,
            totalElements: content.length,
        }
    }

    getDetailedResults(
        result: ISimpleHistoryResult
    ): IBasicResponse<IDetailedHistoryResultItem> | null {
        if (!result.detailedHistoryResult) {
            return null
        }
        return {
            content:
                result.detailedHistoryResult?.map((item) => {
                    const isOpenResultId = /^O[-0-9a-zA-Z]+$/.test(item.value)
                    if (
                        this.openResultBaseURL &&
                        isOpenResultId &&
                        !this.openResultURL
                    ) {
                        this.openResultURL = `${this.openResultBaseURL}${item.value}`
                        this.addOpenResultButton()
                    }
                    if (this.openResultURL && isOpenResultId) {
                        return {
                            title: item.title,
                            value: `<a href="${this.openResultURL}" target="_blank">${item.value}</a>`,
                        }
                    }
                    if (
                        item.title.toLowerCase().includes("net") &&
                        item.value === UNKNOWN
                    ) {
                        return {
                            title: item.title,
                            value: "LAN",
                        }
                    }
                    return item
                }) ?? [],
            totalElements: result.detailedHistoryResult?.length ?? 0,
        }
    }

    weHaveToGoBack() {
        if (this.mainStore.referrer$.value?.includes(ERoutes.HISTORY)) {
            this.router.navigate(["/", ERoutes.HISTORY])
        } else if (
            this.mainStore.referrer$.value?.includes(
                ERoutes.LOOP_RESULT.split("/")[0]
            )
        ) {
            const parts = this.mainStore.referrer$.value.split("/")
            this.router.navigateByUrl(
                ERoutes.LOOP_RESULT.replace(
                    ":loopUuid",
                    parts[parts.length - 1]
                )
            )
        } else {
            this.router.navigate(["/"])
        }
    }

    private addOpenResultButton() {
        this.actionButtons.push({
            label: "Open in browser",
            translations: [],
            icon: "new-window",
            action: () => {
                if (this.openResultURL) {
                    window.open(this.openResultURL, "_blank")
                }
                return of(null)
            },
        })
    }
}
