import { Component } from "@angular/core"
import { MainStore } from "./store/main.store"

@Component({
    selector: "app-root",
    templateUrl: "./app.component.html",
    styleUrls: ["./app.component.scss"],
})
export class AppComponent {
    constructor(private mainStore: MainStore) {
        this.mainStore.init()
    }
}
