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
import { ActivatedRouteSnapshot } from "@angular/router"

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
        loopUuid: this.activatedRoute.params["loopUuid"],
    })

    constructor(
        mainStore: MainStore,
        message: MessageService,
        cdr: ChangeDetectorRef,
        store: HistoryStore,
        transloco: TranslocoService,
        private activatedRoute: ActivatedRouteSnapshot
    ) {
        super(mainStore, message, store, cdr, transloco)
    }
}
