import { Component, Input, OnInit } from "@angular/core"
import { map } from "rxjs"
import {
    IDynamicComponent,
    IDynamicComponentParameters,
} from "src/app/interfaces/dynamic-component.interface"
import { TestStore } from "src/app/store/test.store"

/**
 * Test-server selection (ports the website's "Test server" option). The desktop
 * backend already carries the whole mechanism — TestStore.getServers() fetches
 * the servers reachable for this client, TestStore.setActiveServer() persists
 * the choice as ACTIVE_SERVER, and the registration request turns a chosen
 * server into `prefer_server` / `user_server_selection`. This widget only adds
 * the missing UI. The settings screen shows it only when SHOW_SERVER_SELECTION
 * is set — i.e. the `--debug` switch is on, or a non-default server is already
 * selected (see get-env.ts).
 */
@Component({
    selector: "app-settings-server",
    templateUrl: "./settings-server.component.html",
    styleUrl: "./settings-server.component.scss",
    standalone: false,
})
export class SettingsServerComponent implements IDynamicComponent, OnInit {
    @Input() parameters?: IDynamicComponentParameters

    // Sentinel meaning "let the control server pick the nearest server" — the
    // desktop equivalent of the website's "Default server": it clears any
    // stored ACTIVE_SERVER so registration falls back to the nearest server.
    static readonly DEFAULT = "default"

    // View model: the "Default server" option followed by every reachable
    // server, plus the currently selected id (the active server's id as a
    // string, else the default sentinel). Server ids are numeric, but the radio
    // group works in strings, so we compare via String(id).
    vm$ = this.testStore.servers$.pipe(
        map((servers) => {
            const options = [
                { id: SettingsServerComponent.DEFAULT, name: "Default server" },
                ...servers.map((s) => ({ id: String(s.id), name: s.name })),
            ]
            const active = servers.find((s) => s.active)
            const selected = active
                ? String(active.id)
                : SettingsServerComponent.DEFAULT
            return { options, selected }
        }),
    )

    constructor(private readonly testStore: TestStore) {}

    ngOnInit(): void {
        // Load the reachable servers (marks the stored one as active).
        this.testStore.getServers()
    }

    change(id: string) {
        if (id === SettingsServerComponent.DEFAULT) {
            this.testStore.setActiveServer(null)
            return
        }
        const server = this.testStore.servers$.value.find(
            (s) => String(s.id) === id,
        )
        this.testStore.setActiveServer(server ?? null)
    }
}
