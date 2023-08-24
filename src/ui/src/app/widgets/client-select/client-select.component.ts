import { Component } from "@angular/core"
import { combineLatest, map } from "rxjs"
import {
    IDynamicComponent,
    IDynamicComponentParameters,
} from "src/app/interfaces/dynamic-component.interface"
import { CMSService } from "src/app/services/cms.service"
import { MainStore } from "src/app/store/main.store"

@Component({
    selector: "app-client-select",
    templateUrl: "./client-select.component.html",
    styleUrls: ["./client-select.component.scss"],
})
export class ClientSelectComponent implements IDynamicComponent {
    parameters?: IDynamicComponentParameters
    clients$ = combineLatest([
        this.mainStore.env$,
        this.cms.getProjects(),
    ]).pipe(
        map(([env, projects]) => {
            this.activeClient =
                projects.find((c) => c.slug === env?.X_NETTEST_CLIENT) ??
                projects[0]
            return projects
        })
    )
    activeClient?: any

    constructor(private mainStore: MainStore, private cms: CMSService) {}

    changeClient(client: any) {
        this.activeClient = client
        this.mainStore.setClient(client.slug)
    }
}
