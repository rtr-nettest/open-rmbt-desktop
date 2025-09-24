import {
    ChangeDetectionStrategy,
    Component,
    OnDestroy,
    signal,
} from "@angular/core"
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
import { UNKNOWN } from "src/app/constants/strings"
import { I18nService } from "src/app/services/i18n.service"
import { HistoryExportService } from "src/app/services/history-export.service"
import { SKIPPED_FIELDS } from "src/app/constants/skipped-details-fields"
import { SEARCHABLE_FIELDS } from "src/app/constants/searchable-details-fields"
import { FORMATTED_FIELDS } from "src/app/constants/formatted-details-fields"

@Component({
    selector: "app-result-screen",
    templateUrl: "./result-screen.component.html",
    styleUrls: ["./result-screen.component.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
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
                    this.i18n.getActiveBrowserLang(),
                ) ?? ""
        }),
    )
    error$ = this.mainStore.error$
    loading = signal<boolean>(true)
    openResultBaseURL = ""
    openResultURL = ""
    result$ = this.store
        .getMeasurementResult(this.route.snapshot.paramMap.get("testUuid"))
        .pipe(
            tap((result) => {
                if (result && result.openTestResponse?.["error"] != true) {
                    this.basicResults.set(this.getBasicResults(result))
                    this.detailedResults.set(this.getDetailedResults(result))
                } else if (
                    result &&
                    result.openTestResponse?.["error"] == true
                ) {
                    this.failedDetailedResults.set(
                        this.getDetailedResults(result),
                    )
                }
                this.loading.set(false)
            }),
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
                this.exporter.exportAsPdf([
                    this.store.simpleHistoryResult$.value!,
                ]),
        },
    ]
    locale = this.transloco.getActiveLang()
    basicResults = signal<IBasicResponse<IDetailedHistoryResultItem> | null>(
        null,
    )
    detailedResults = signal<IBasicResponse<IDetailedHistoryResultItem> | null>(
        null,
    )
    failedDetailedResults =
        signal<IBasicResponse<IDetailedHistoryResultItem> | null>(null)

    constructor(
        private classification: ClassificationService,
        private conversion: ConversionService,
        private exporter: HistoryExportService,
        private i18n: I18nService,
        private mainStore: MainStore,
        private store: TestStore,
        private route: ActivatedRoute,
        private router: Router,
        private transloco: TranslocoService,
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
        result: ISimpleHistoryResult,
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
                                    result.downloadClass,
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
                                    result.uploadClass,
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
                                    result.pingClass,
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
        result: ISimpleHistoryResult,
    ): IBasicResponse<IDetailedHistoryResultItem> | null {
        if (!result.openTestResponse) {
            return null
        }
        let content = [] as IDetailedHistoryResultItem[]
        Object.entries(result.openTestResponse).forEach(([key, value]) => {
            if (
                value?.toString().includes("[object Object]") ||
                SKIPPED_FIELDS.has(key) ||
                value === null ||
                value === undefined ||
                (key === "implausible" && !value)
            ) {
                return
            }
            const isOpenResultId = /^O[-0-9a-zA-Z]+$/.test(value)
            if (
                this.openResultBaseURL &&
                isOpenResultId &&
                !this.openResultURL
            ) {
                this.openResultURL = `${this.openResultBaseURL}${value}`
                this.addOpenResultButton()
            }
            if (this.openResultURL && isOpenResultId) {
                content.push({
                    title: this.transloco.translate(key),
                    value: `<a href="${this.openResultURL}" target="_blank">${value}</a>`,
                })
                return
            }
            if (key == "land_cover") {
                content = [
                    ...content,
                    ...this.formatLandCovers(result.openTestResponse),
                ]
                return
            }
            if (key.toLowerCase().includes("net") && value === UNKNOWN) {
                value = "LAN"
            }
            content.push(
                this.formatSearchableItem(result.openTestResponse, key, value),
            )
        })
        return {
            content,
            totalElements: content.length ?? 0,
        }
    }

    weHaveToGoBack() {
        if (this.mainStore.referrer$.value?.includes(ERoutes.HISTORY)) {
            this.router.navigate(["/", ERoutes.HISTORY])
        } else if (
            this.mainStore.referrer$.value?.includes(
                ERoutes.LOOP_RESULT.split("/")[0],
            )
        ) {
            const parts = this.mainStore.referrer$.value.split("/")
            this.router.navigateByUrl(
                ERoutes.LOOP_RESULT.replace(
                    ":loopUuid",
                    parts[parts.length - 1],
                ),
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

    private formatLandCovers(openTestResponse: any) {
        return [
            {
                title: this.transloco.translate("land_cover_cat1"),
                value: FORMATTED_FIELDS["land_cover_cat1"]!(
                    openTestResponse,
                    this.transloco.getTranslation(),
                    this.transloco.getActiveLang(),
                ),
            },
            {
                title: this.transloco.translate("land_cover_cat2"),
                value: FORMATTED_FIELDS["land_cover_cat2"]!(
                    openTestResponse,
                    this.transloco.getTranslation(),
                    this.transloco.getActiveLang(),
                ),
            },
        ]
    }

    private formatSearchableItem(
        openTestResponse: any,
        key: string,
        value: any,
    ) {
        const searchable = SEARCHABLE_FIELDS[key] !== undefined
        let v = FORMATTED_FIELDS[key]
            ? FORMATTED_FIELDS[key]!(
                  openTestResponse,
                  this.transloco.getTranslation(this.transloco.getActiveLang()),
                  this.transloco.getActiveLang(),
              )
            : value
        if (!searchable) {
            return {
                title: this.transloco.translate(key),
                value: v,
            }
        }
        const searchTerm = SEARCHABLE_FIELDS[key]
            ? SEARCHABLE_FIELDS[key]!(openTestResponse)
            : undefined
        const search = Array.isArray(searchTerm)
            ? searchTerm.map((term) => `${key}=${term}`).join("&")
            : `${key}=${searchTerm || value}`
        const values = key === "time" ? v.split(" ") : [v]
        return {
            title: this.transloco.translate(key),
            value: `<a href="${this.openResultBaseURL.replace("Opentest?", "opentests?").replace("opentest?", "opentests?")}${search}" target="_blank">${values[0]}</a>&nbsp;${values[1] ?? ""}`,
        }
    }
}
