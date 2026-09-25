import { Component, Input } from "@angular/core"
import { combineLatest, map } from "rxjs"
import {
    IDynamicComponent,
    IDynamicComponentParameters,
} from "src/app/interfaces/dynamic-component.interface"
import { MainStore } from "src/app/store/main.store"
import { TestStore } from "src/app/store/test.store"
import { IMeasurementServerResponse } from "../../../../../measurement/interfaces/measurement-server-response.interface"

/**
 * Test-server selection (ports the website's "Test server" option). The server
 * list comes straight from the control server's settings response (`servers_ws`
 * — name + uuid), the same source the website uses; no separate endpoint or
 * .env path is involved. The chosen server is persisted (as a { uuid, name })
 * via setActiveServer, and the registration request sends its uuid as
 * `prefer_server`. The settings screen shows this row only when `--debug`
 * (env.DEBUG) is set or a non-default server is currently chosen
 * (env.PREFERRED_SERVER); that gate reacts to env changes, so selecting
 * "Default server" clears PREFERRED_SERVER and the row disappears live.
 */
@Component({
    selector: "app-settings-server",
    templateUrl: "./settings-server.component.html",
    styleUrl: "./settings-server.component.scss",
    standalone: false,
})
export class SettingsServerComponent implements IDynamicComponent {
    @Input() parameters?: IDynamicComponentParameters

    // Sentinel meaning "let the control server pick the nearest server" — the
    // desktop equivalent of the website's "Default server".
    static readonly DEFAULT = "default"

    // View model: the "Default server" option followed by every server from the
    // settings `servers_ws` list, plus the currently selected uuid (from the
    // env, persisted in ACTIVE_SERVER), else the default sentinel.
    vm$ = combineLatest([this.mainStore.settings$, this.mainStore.env$]).pipe(
        map(([settings, env]) => {
            const servers = settings?.servers_ws ?? []
            const options = [
                { id: SettingsServerComponent.DEFAULT, name: "Default server" },
                ...servers.map((s) => ({ id: s.uuid, name: s.name })),
            ]
            const selected =
                env?.PREFERRED_SERVER || SettingsServerComponent.DEFAULT
            return { options, selected }
        }),
    )

    constructor(
        private readonly mainStore: MainStore,
        private readonly testStore: TestStore,
    ) {}

    change(uuid: string) {
        const chosen = (this.mainStore.settings$.value?.servers_ws ?? []).find(
            (s) => s.uuid === uuid,
        )
        // Reflect the choice in env so the radio stays selected immediately, and
        // persist it to the main-process store (empty for "Default server").
        this.mainStore.env$.next({
            ...this.mainStore.env$.value!,
            PREFERRED_SERVER: chosen?.uuid ?? "",
        })
        this.testStore.setActiveServer(
            chosen
                ? ({
                      uuid: chosen.uuid,
                      name: chosen.name,
                  } as unknown as IMeasurementServerResponse)
                : null,
        )
    }
}
