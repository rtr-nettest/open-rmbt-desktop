import { Component, Input } from "@angular/core"
import { MatSelectChange } from "@angular/material/select"
import {
    IDynamicComponent,
    IDynamicComponentParameters,
} from "src/app/interfaces/dynamic-component.interface"
import { MainStore } from "src/app/store/main.store"

@Component({
    selector: "app-settings-engine",
    templateUrl: "./settings-engine.component.html",
    styleUrl: "./settings-engine.component.scss",
})
export class SettingsEngineComponent implements IDynamicComponent {
    @Input() parameters?: IDynamicComponentParameters
    engines = [
        { id: "node", name: "NodeJS" },
        { id: "java", name: "Java" },
    ]
    selectedEngine = this.engines.find(
        (l) => l.id === this.mainStore.env$.value?.MEASUREMENT_ENGINE,
    )

    constructor(private readonly mainStore: MainStore) {}

    change(event: MatSelectChange) {
        window.electronAPI.setMeasurementEngine(event.value.id)
    }
}
