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

    // All engines the app knows about, in display order. Only those actually
    // available on the running platform (env.AVAILABLE_ENGINES, provided by the
    // main process) are shown; add "java" here once it ships.
    private allEngines = [
        { id: "rust", name: "Rust (native)" },
        { id: "c", name: "C (native)" },
        { id: "node", name: "JavaScript (NodeJS)" },
    ]

    // View model: the engines to show plus the currently selected id. The main
    // process already resets an unavailable stored engine to the default, but we
    // guard here too so exactly one available option is always selected.
    vm$ = this.mainStore.env$.pipe(
        map((env) => {
            const available = env?.AVAILABLE_ENGINES ?? ["rust", "node"]
            const engines = this.allEngines.filter((e) =>
                available.includes(e.id),
            )
            let selected = env?.MEASUREMENT_ENGINE
            if (!engines.some((e) => e.id === selected)) {
                selected = engines[0]?.id
            }
            return { engines, selected }
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
