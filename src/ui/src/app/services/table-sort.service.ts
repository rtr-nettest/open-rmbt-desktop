import { Injectable } from "@angular/core"
import { PageEvent } from "@angular/material/paginator"
import { Sort } from "@angular/material/sort"

@Injectable({
    providedIn: "root",
})
export class TableSortService {
    constructor() {}

    changeSort(newSort: Sort, action?: (...args: any) => any) {
        action?.(newSort)
    }

    changePage(page: PageEvent, action?: (...args: any) => any) {
        // TODO
    }
}
