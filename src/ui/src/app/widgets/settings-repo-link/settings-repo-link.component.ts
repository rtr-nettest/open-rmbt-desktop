import { Component } from "@angular/core"
import { map } from "rxjs"
import { MainStore } from "src/app/store/main.store"

@Component({
    selector: "app-settings-repo-link",
    templateUrl: "./settings-repo-link.component.html",
    styleUrls: ["./settings-repo-link.component.scss"],
})
export class SettingsRepoLinkComponent {
    repoLink$ = this.store.env$.pipe(map((s) => s?.REPO_URL))

    constructor(private store: MainStore) {}
}
