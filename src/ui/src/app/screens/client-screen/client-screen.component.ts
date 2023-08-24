import { Component, ViewChild } from "@angular/core"
import { Router } from "@angular/router"
import { ClientSelectComponent } from "src/app/widgets/client-select/client-select.component"

@Component({
    selector: "app-client-screen",
    templateUrl: "./client-screen.component.html",
    styleUrls: ["./client-screen.component.scss"],
})
export class ClientScreenComponent {
    @ViewChild(ClientSelectComponent) clientSelect?: ClientSelectComponent

    constructor(private router: Router) {}

    letsGo() {
        this.clientSelect?.changeClient(this.clientSelect?.activeClient)
        this.router.navigateByUrl("/")
    }
}
