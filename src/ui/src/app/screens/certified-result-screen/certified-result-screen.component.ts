import { ChangeDetectorRef, Component, Input, OnInit } from "@angular/core"
import { HistoryScreenComponent } from "../history-screen/history-screen.component"
import { Observable, of } from "rxjs"
import { IBasicResponse } from "src/app/interfaces/basic-response.interface"
import {
    IHistoryRowONT,
    IHistoryRowRTR,
} from "src/app/interfaces/history-row.interface"
import { IMainMenuItem } from "src/app/interfaces/main-menu-item.interface"

@Component({
    selector: "app-certified-result-screen",
    templateUrl: "../history-screen/history-screen.component.html",
    styleUrls: ["../history-screen/history-screen.component.scss"],
})
export class CertifiedResultScreenComponent extends HistoryScreenComponent {
    @Input() loopUuid: string | null = null

    override shouldGroupHistory = false
    override pageTitle = "Certified measurement results"
    override result$: Observable<
        IBasicResponse<IHistoryRowRTR | IHistoryRowONT>
    > = of()
    override actionButtons: IMainMenuItem[] = [
        {
            label: "",
            translations: [],
            icon: "filetype-pdf",
            action: () => this.exporter.exportAsCertified(this.loopUuid),
        },
    ]

    override ngOnInit(): void {
        this.result$ = this.store.getFormattedHistory({
            grouped: this.shouldGroupHistory,
            loopUuid: this.loopUuid,
        })
        super.ngOnInit()
    }
}
