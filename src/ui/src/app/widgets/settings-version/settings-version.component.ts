import { Component } from "@angular/core"
import { map } from "rxjs"
import { MainStore } from "src/app/store/main.store"

@Component({
    selector: "app-settings-version",
    templateUrl: "./settings-version.component.html",
    styleUrls: ["./settings-version.component.scss"],
})
export class SettingsVersionComponent {
    version$ = this.store.env$.pipe(map((s) => s?.APP_VERSION))

    constructor(private store: MainStore) {}
}
