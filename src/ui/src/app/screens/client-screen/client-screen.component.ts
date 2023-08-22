import { Component, OnInit } from "@angular/core"
import { MatSelectChange } from "@angular/material/select"
import { Router } from "@angular/router"
import { CLIENTS } from "src/app/constants/clients"
import { MainStore } from "src/app/store/main.store"

@Component({
    selector: "app-client-screen",
    templateUrl: "./client-screen.component.html",
    styleUrls: ["./client-screen.component.scss"],
})
export class ClientScreenComponent implements OnInit {
    clients = CLIENTS
    activeClient = CLIENTS[0]

    constructor(private mainStore: MainStore, private router: Router) {}

    ngOnInit(): void {
        this.changeClient(this.activeClient)
    }

    changeClient(client: any) {
        this.activeClient = client
        this.mainStore.setClient(client.slug)
    }

    letsGo() {
        this.router.navigateByUrl("/")
    }
}
