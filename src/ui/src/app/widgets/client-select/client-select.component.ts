import { Component, Input } from "@angular/core"
import { combineLatest, map } from "rxjs"
import {
    IDynamicComponent,
    IDynamicComponentParameters,
} from "src/app/interfaces/dynamic-component.interface"
import { CMSService } from "src/app/services/cms.service"
import { MainStore } from "src/app/store/main.store"
import { TestStore } from "src/app/store/test.store"

@Component({
    selector: "app-client-select",
    templateUrl: "./client-select.component.html",
    styleUrls: ["./client-select.component.scss"],
})
export class ClientSelectComponent implements IDynamicComponent {
    @Input() parameters?: IDynamicComponentParameters
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

    constructor(
        private mainStore: MainStore,
        private testStore: TestStore,
        private cms: CMSService
    ) {}

    changeClient(client: any) {
        this.activeClient = client
        this.mainStore.setClient(client.slug)
        this.testStore.setActiveServer(null)
        if (this.parameters?.["reloadPage"]) {
            location.reload()
        }
    }
}
