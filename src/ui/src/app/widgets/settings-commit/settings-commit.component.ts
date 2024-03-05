import { Component } from "@angular/core"
import { map } from "rxjs"
import { MainStore } from "src/app/store/main.store"

@Component({
    selector: "app-settings-commit",
    templateUrl: "./settings-commit.component.html",
    styleUrls: ["./settings-commit.component.scss"],
})
export class SettingsCommitComponent {
    commit$ = this.store.env$.pipe(map((s) => s?.GIT_INFO))

    constructor(private store: MainStore) {}
}
