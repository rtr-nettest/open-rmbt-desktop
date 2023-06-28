import { Injectable } from "@angular/core"
import { PageEvent } from "@angular/material/paginator"
import { MatSort, Sort } from "@angular/material/sort"

@Injectable({
    providedIn: "root",
})
export class TableSortService {
    constructor() {}

    changeSort(newSort: Sort, action?: (...args: []) => any) {
        // TODO
    }

    changePage(page: PageEvent, action?: (...args: []) => any) {
        // TODO
    }
}
