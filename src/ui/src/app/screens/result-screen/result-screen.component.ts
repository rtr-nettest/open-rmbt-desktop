import { ChangeDetectionStrategy, Component } from "@angular/core"
import { ActivatedRoute } from "@angular/router"
import { TranslocoService } from "@ngneat/transloco"
import { getSignificantDigits } from "src/app/helpers/number"
import { ITableColumn } from "src/app/interfaces/table-column.interface"
import { MainStore } from "src/app/store/main.store"
import { TestStore } from "src/app/store/test.store"
import { ISimpleHistoryResult } from "../../../../../measurement/interfaces/simple-history-result.interface"
import { IDetailedHistoryResultItem } from "../../../../../measurement/interfaces/detailed-history-result-item.interface"
import { IBasicResponse } from "src/app/interfaces/basic-response.interface"
import { ISort } from "src/app/interfaces/sort.interface"
import { tap } from "rxjs"
import { IMainMenuItem } from "src/app/interfaces/main-menu-item.interface"

@Component({
    selector: "app-result-screen",
    templateUrl: "./result-screen.component.html",
    styleUrls: ["./result-screen.component.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResultScreenComponent {
    columns: ITableColumn[] = [
        {
            columnDef: "title",
            header: "",
        },
        {
            columnDef: "value",
            header: "",
        },
    ]
    env$ = this.mainStore.env$.pipe(
        tap((env) => {
            this.openResultURL =
                env?.OPEN_HISTORY_RESUlT_URL?.replace(
                    "$lang",
                    this.transloco.getActiveLang()
                ) ?? ""
        })
    )
    error$ = this.mainStore.error$
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
            label: "",
            translations: [],
            icon: "filetype-pdf",
            action: () =>
                this.store.exportAsPdf([
                    this.store.simpleHistoryResult$.value!,
                ]),
        },
    ]

    constructor(
        private store: TestStore,
        private mainStore: MainStore,
        private route: ActivatedRoute,
        private transloco: TranslocoService
    ) {}

    getIconByClass(classification?: number) {
        switch (classification) {
            case 1:
                return '<i class="app-icon--class app-icon--class-red"></i>'
            case 2:
                return '<i class="app-icon--class app-icon--class-yellow"></i>'
            case 3:
                return '<i class="app-icon--class app-icon--class-green"></i>'
            case 4:
                return '<i class="app-icon--class app-icon--class-greenest"></i>'
            default:
                return ""
        }
    }

    getSpeedInMbps(speed: number) {
        return (
            getSignificantDigits(speed / 1e3) +
            " " +
            this.transloco.translate("Mbps")
        )
    }

    getPingInMs(ping: number) {
        return getSignificantDigits(ping) + " " + this.transloco.translate("ms")
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
                                this.getIconByClass(result.downloadClass) +
                                this.getSpeedInMbps(value),
                        },
                    ]
                case "uploadKbit":
                    return [
                        ...acc,
                        {
                            title: "Upload",
                            value:
                                this.getIconByClass(result.uploadClass) +
                                this.getSpeedInMbps(value),
                        },
                    ]
                case "ping":
                    return [
                        ...acc,
                        {
                            title: "Ping",
                            value:
                                this.getIconByClass(result.pingClass) +
                                this.getPingInMs(value),
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
                result.detailedHistoryResult?.map((item) =>
                    this.openResultURL && /^O[-0-9a-zA-Z]+$/.test(item.value)
                        ? {
                              title: item.title,
                              value: `<a href="${this.openResultURL}${item.value}" target="_blank">${item.value}</a>`,
                          }
                        : item
                ) ?? [],
            totalElements: result.detailedHistoryResult?.length ?? 0,
        }
    }
}
