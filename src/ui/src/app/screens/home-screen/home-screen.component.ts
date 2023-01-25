import { Component } from "@angular/core"
import { CoreStore } from "src/app/store/core.store"

@Component({
    selector: "app-home-screen",
    templateUrl: "./home-screen.component.html",
    styleUrls: ["./home-screen.component.scss"],
})
export class HomeScreenComponent {
    env$ = this.coreStore.env$

    constructor(private coreStore: CoreStore) {}
}
