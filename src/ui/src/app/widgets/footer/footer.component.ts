import { Component } from "@angular/core"
import { CoreStore } from "src/app/store/core.store"

@Component({
    selector: "app-footer",
    templateUrl: "./footer.component.html",
    styleUrls: ["./footer.component.scss"],
})
export class FooterComponent {
    env$ = this.coreStore.env$

    constructor(private coreStore: CoreStore) {}
}
