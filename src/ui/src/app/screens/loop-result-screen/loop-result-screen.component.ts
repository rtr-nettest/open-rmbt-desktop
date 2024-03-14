import { ChangeDetectorRef, Component } from "@angular/core"
import { Observable } from "rxjs"
import { IBasicResponse } from "src/app/interfaces/basic-response.interface"
import {
    IHistoryRowONT,
    IHistoryRowRTR,
} from "src/app/interfaces/history-row.interface"
import { HistoryScreenComponent } from "../history-screen/history-screen.component"
import { MainStore } from "src/app/store/main.store"
import { MessageService } from "src/app/services/message.service"
import { HistoryStore } from "src/app/store/history.store"
import { TranslocoService } from "@ngneat/transloco"
import { ActivatedRoute } from "@angular/router"
import { IMainMenuItem } from "src/app/interfaces/main-menu-item.interface"
import { HistoryExportService } from "src/app/services/history-export.service"

@Component({
    selector: "app-loop-result-screen",
    templateUrl: "../history-screen/history-screen.component.html",
    styleUrls: ["../history-screen/history-screen.component.scss"],
})
export class LoopResultScreenComponent extends HistoryScreenComponent {
    override shouldGroupHistory = false
    override pageTitle = "Loop measurement results"
    override result$: Observable<
        IBasicResponse<IHistoryRowRTR | IHistoryRowONT>
    > = this.store.getFormattedHistory({
        grouped: this.shouldGroupHistory,
        loopUuid: this.activatedRoute.snapshot.params["loopUuid"],
    })
    override actionButtons: IMainMenuItem[] = [
        {
            label: "",
            translations: [],
            icon: "filetype-csv",
            action: () => this.exporter.exportAs("csv", this.loopResults),
        },
        {
            label: "",
            translations: [],
            icon: "filetype-pdf",
            action: () => this.exporter.exportAsPdf(this.loopResults),
        },
        {
            label: "",
            translations: [],
            icon: "filetype-xlsx",
            action: () => this.exporter.exportAs("xlsx", this.loopResults),
        },
    ]

    private get loopResults() {
        return this.store.getLoopResults(
            this.store.history$.value,
            this.activatedRoute.snapshot.params["loopUuid"]
        )
    }

    constructor(
        exporter: HistoryExportService,
        mainStore: MainStore,
        message: MessageService,
        cdr: ChangeDetectorRef,
        store: HistoryStore,
        transloco: TranslocoService,
        private activatedRoute: ActivatedRoute
    ) {
        super(mainStore, message, exporter, store, cdr, transloco)
    }
}
