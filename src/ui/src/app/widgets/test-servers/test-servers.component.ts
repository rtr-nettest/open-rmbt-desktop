import { Component, OnInit } from "@angular/core"
import { MatSelectChange } from "@angular/material/select"
import { TestStore } from "src/app/store/test.store"
import { IMeasurementServerResponse } from "../../../../../measurement/interfaces/measurement-server-response.interface"
import { map } from "rxjs"

@Component({
    selector: "app-test-servers",
    templateUrl: "./test-servers.component.html",
    styleUrls: ["./test-servers.component.scss"],
})
export class TestServersComponent implements OnInit {
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

    constructor(private store: TestStore) {}

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
