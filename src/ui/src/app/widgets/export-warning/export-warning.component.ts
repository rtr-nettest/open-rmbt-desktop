import { Component } from "@angular/core"
import { map } from "rxjs"
import { TestStore } from "src/app/store/test.store"

@Component({
    selector: "app-export-warning",
    templateUrl: "./export-warning.component.html",
    styleUrls: ["./export-warning.component.scss"],
})
export class ExportWarningComponent {
    isLocal$ = this.store.simpleHistoryResult$.pipe(
        map((result) => result?.isLocal)
    )

    constructor(private store: TestStore) {}
}
