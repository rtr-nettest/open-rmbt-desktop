import { Component } from "@angular/core"
import { CoreStore } from "./store/core.store"

@Component({
    selector: "app-root",
    templateUrl: "./app.component.html",
    styleUrls: ["./app.component.scss"],
})
export class AppComponent {
    constructor(private coreStore: CoreStore) {
        this.coreStore.init()
    }
}
