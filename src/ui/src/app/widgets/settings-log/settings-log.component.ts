import { Component } from "@angular/core"
import { map } from "rxjs"
import { MainStore } from "src/app/store/main.store"

/**
 * Shows where log files are written. LOG_PATH is set by the main process
 * (get-env.ts) only when file logging is enabled — via .env (LOG_TO_FILE) or
 * the `--file-log` switch — so the settings row that hosts this widget is only
 * added when the path is non-empty.
 */
@Component({
    selector: "app-settings-log",
    templateUrl: "./settings-log.component.html",
    styleUrls: ["./settings-log.component.scss"],
    standalone: false,
})
export class SettingsLogComponent {
    logPath$ = this.store.env$.pipe(map((s) => s?.LOG_PATH))

    constructor(private store: MainStore) {}
}
