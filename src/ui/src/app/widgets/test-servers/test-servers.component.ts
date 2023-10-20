import { Component, Input, OnInit } from "@angular/core"
import { MatSelectChange } from "@angular/material/select"
import { TestStore } from "src/app/store/test.store"
import { IMeasurementServerResponse } from "../../../../../measurement/interfaces/measurement-server-response.interface"
import { map } from "rxjs"
import { CMSService } from "src/app/services/cms.service"
import {
    IDynamicComponent,
    IDynamicComponentParameters,
} from "src/app/interfaces/dynamic-component.interface"

@Component({
    selector: "app-test-servers",
    templateUrl: "./test-servers.component.html",
    styleUrls: ["./test-servers.component.scss"],
})
export class TestServersComponent implements OnInit, IDynamicComponent {
    @Input() parameters?: IDynamicComponentParameters | undefined
    project$ = this.cms.getProject()
    servers$ = this.store.servers$.pipe(
        map((servers) => {
            if (servers.length) {
                this.activeServer =
                    servers.find((s) => !!s.active) ?? servers[0]
                return servers
            }
            return null
        })
    )
    activeServer?: IMeasurementServerResponse

    constructor(private store: TestStore, private cms: CMSService) {}

    ngOnInit(): void {
        this.store.getServers()
    }

    changeServer($event: MatSelectChange) {
        this.store.setActiveServer($event.value)
    }

    compareIds(option: any, value: any): boolean {
        return option.id === value.id
    }
}
