import { Component } from "@angular/core"
import { map } from "rxjs"
import { CLIENTS } from "src/app/constants/clients"
import {
    IDynamicComponent,
    IDynamicComponentParameters,
} from "src/app/interfaces/dynamic-component.interface"
import { MainStore } from "src/app/store/main.store"

@Component({
    selector: "app-client-select",
    templateUrl: "./client-select.component.html",
    styleUrls: ["./client-select.component.scss"],
})
export class ClientSelectComponent implements IDynamicComponent {
    parameters?: IDynamicComponentParameters
    clients$ = this.mainStore.env$.pipe(
        map((env) => {
            this.activeClient =
                CLIENTS.find((c) => c.slug === env?.X_NETTEST_CLIENT) ??
                CLIENTS[0]
            return CLIENTS
        })
    )
    activeClient?: any

    constructor(private mainStore: MainStore) {}

    changeClient(client: any) {
        this.activeClient = client
        this.mainStore.setClient(client.slug)
    }
}
