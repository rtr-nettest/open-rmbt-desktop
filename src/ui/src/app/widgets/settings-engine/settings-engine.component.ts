import { Component, Input } from "@angular/core"
import { map } from "rxjs"
import {
    IDynamicComponent,
    IDynamicComponentParameters,
} from "src/app/interfaces/dynamic-component.interface"
import { MainStore } from "src/app/store/main.store"

@Component({
    selector: "app-settings-engine",
    templateUrl: "./settings-engine.component.html",
    styleUrl: "./settings-engine.component.scss",
    standalone: false,
})
export class SettingsEngineComponent implements IDynamicComponent {
    @Input() parameters?: IDynamicComponentParameters

    // Selectable measurement engines. Add "c" / "java" entries here as they ship;
    // the radio list renders however many are present, always with one active.
    engines = [
        { id: "rust", name: "Rust (native)" },
        { id: "node", name: "JavaScript (NodeJS)" },
    ]

    // Currently active engine id. Unknown / legacy values (e.g. "java") fall back
    // to the first option so exactly one radio is always selected.
    selectedEngineId$ = this.mainStore.env$.pipe(
        map((env) => {
            const id = env?.MEASUREMENT_ENGINE
            return this.engines.some((e) => e.id === id)
                ? (id as string)
                : this.engines[0].id
        }),
    )

    constructor(private readonly mainStore: MainStore) {}

    change(id: string) {
        this.mainStore.env$.next({
            ...this.mainStore.env$.value!,
            MEASUREMENT_ENGINE: id,
        })
        window.electronAPI.setMeasurementEngine(id)
    }
}
