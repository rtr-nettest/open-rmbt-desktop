import { Component, Input, model } from "@angular/core"
import { MatSelectChange } from "@angular/material/select"
import { map, tap } from "rxjs"
import {
    IDynamicComponent,
    IDynamicComponentParameters,
} from "src/app/interfaces/dynamic-component.interface"
import { MainStore } from "src/app/store/main.store"

@Component({
    selector: "app-settings-engine",
    templateUrl: "./settings-engine.component.html",
    styleUrl: "./settings-engine.component.scss",
    standalone: false
})
export class SettingsEngineComponent implements IDynamicComponent {
    @Input() parameters?: IDynamicComponentParameters
    engines = [
        { id: "node", name: "NodeJS" },
        { id: "java", name: "Java" },
    ]
    selectedEngine$ = this.mainStore.env$.pipe(
        tap((env) => {
            this.selectedEngine.set(
                this.engines.find((l) => l.id === env?.MEASUREMENT_ENGINE),
            )
        }),
    )
    selectedEngine = model<any>(null)

    constructor(private readonly mainStore: MainStore) {}

    change(event: MatSelectChange) {
        this.mainStore.env$.next({
            ...this.mainStore.env$.value!,
            MEASUREMENT_ENGINE: event.value.id,
        })
        window.electronAPI.setMeasurementEngine(event.value.id)
    }
}
