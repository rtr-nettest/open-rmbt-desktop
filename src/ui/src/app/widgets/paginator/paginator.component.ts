import {
    AfterViewInit,
    Component,
    EventEmitter,
    Input,
    OnDestroy,
    Output,
    ViewChild,
} from "@angular/core"
import { MatPaginator, PageEvent } from "@angular/material/paginator"
import { TranslocoService } from "@ngneat/transloco"
import { combineLatest, Subscription } from "rxjs"

@Component({
    selector: "app-paginator",
    templateUrl: "./paginator.component.html",
    styleUrls: ["./paginator.component.scss"],
})
export class PaginatorComponent implements AfterViewInit, OnDestroy {
    @Input() length: number = 0
    @Input() pageIndex: number = 0
    @Input() pageSize: number = 0
    @Input() pageSizeOptions: number[] = []

    @Output() page: EventEmitter<PageEvent> = new EventEmitter()

    @ViewChild(MatPaginator) paginator!: MatPaginator

    private sub?: Subscription

    constructor(private transloco: TranslocoService) {}

    ngAfterViewInit(): void {
        this.sub = combineLatest([
            this.transloco.selectTranslate("paginator.items_per_page_label"),
            this.transloco.selectTranslate("paginator.next_page_label"),
            this.transloco.selectTranslate("paginator.previous_page_label"),
            this.transloco.selectTranslate("paginator.first_page_label"),
            this.transloco.selectTranslate("paginator.last_page_label"),
        ]).subscribe(
            ([
                itemsPerPageLabel,
                nextPageLabel,
                previousPageLabel,
                firstPageLabel,
                lastPageLabel,
            ]) => {
                this.paginator._intl.itemsPerPageLabel = itemsPerPageLabel
                this.paginator._intl.nextPageLabel = nextPageLabel
                this.paginator._intl.previousPageLabel = previousPageLabel
                this.paginator._intl.firstPageLabel = firstPageLabel
                this.paginator._intl.lastPageLabel = lastPageLabel

                this.paginator._intl.getRangeLabel = (
                    page: number,
                    pageSize: number,
                    length: number
                ): string => {
                    length = Math.max(length, 0)
                    const startIndex = page * pageSize
                    const endIndex =
                        startIndex < length
                            ? Math.min(startIndex + pageSize, length)
                            : startIndex + pageSize
                    return this.transloco.translate(
                        "paginator.get_range_label",
                        {
                            startIndex: startIndex + 1,
                            endIndex,
                            length,
                        }
                    )
                }
            }
        )
    }

    ngOnDestroy(): void {
        this.sub?.unsubscribe()
    }
}
