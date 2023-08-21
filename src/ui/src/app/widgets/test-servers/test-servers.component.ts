import { Component, OnInit } from "@angular/core"
import { TestStore } from "src/app/store/test.store"

@Component({
    selector: "app-test-servers",
    templateUrl: "./test-servers.component.html",
    styleUrls: ["./test-servers.component.scss"],
})
export class TestServersComponent implements OnInit {
    constructor(private store: TestStore) {}

    ngOnInit(): void {
        this.store.getServers()
    }
}
