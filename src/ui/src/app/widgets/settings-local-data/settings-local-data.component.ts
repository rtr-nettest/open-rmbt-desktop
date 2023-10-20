import { Component, Input } from "@angular/core"
import {
    IDynamicComponent,
    IDynamicComponentParameters,
} from "src/app/interfaces/dynamic-component.interface"

@Component({
    selector: "app-settings-local-data",
    templateUrl: "./settings-local-data.component.html",
    styleUrls: ["./settings-local-data.component.scss"],
})
export class SettingsLocalDataComponent implements IDynamicComponent {
    @Input() parameters?: IDynamicComponentParameters

    deleteLocalData() {
        window.electronAPI.deleteLocalData()
    }
}
