import { Component } from "@angular/core"

@Component({
    selector: "app-settings-local-data",
    templateUrl: "./settings-local-data.component.html",
    styleUrls: ["./settings-local-data.component.scss"],
})
export class SettingsLocalDataComponent {
    deleteLocalData() {
        window.electronAPI.deleteLocalData()
    }
}
