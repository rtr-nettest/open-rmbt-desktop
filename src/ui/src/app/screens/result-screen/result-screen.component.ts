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
    env$ = this.mainStore.env$
    error$ = this.mainStore.error$
    result$ = this.store.getMeasurementResult(
        this.route.snapshot.paramMap.get("testUuid")
    )
    sort: ISort = {
        active: "",
        direction: "",
    }

    constructor(
        private store: TestStore,
        private mainStore: MainStore,
        private route: ActivatedRoute,
        private transloco: TranslocoService
    ) {}

    getIconStyleByClass(classification: number) {
        switch (classification) {
            case 1:
                return ["app-icon--class", "app-icon--class-red"]
            case 2:
                return ["app-icon--class", "app-icon--class-yellow"]
            case 3:
                return ["app-icon--class", "app-icon--class-green"]
            case 4:
                return ["app-icon--class", "app-icon--class-greenest"]
            default:
                return ["app-icon--class"]
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
                            value: this.getSpeedInMbps(value),
                        },
                    ]
                case "uploadKbit":
                    return [
                        ...acc,
                        { title: "Upload", value: this.getSpeedInMbps(value) },
                    ]
                case "ping":
                    return [
                        ...acc,
                        { title: "Ping", value: this.getPingInMs(value) },
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
    ): IBasicResponse<IDetailedHistoryResultItem> {
        console.log(
            "result.detailedHistoryResult",
            result.detailedHistoryResult
        )
        return {
            content: result.detailedHistoryResult ?? [],
            totalElements: result.detailedHistoryResult?.length ?? 0,
        }
    }
}
