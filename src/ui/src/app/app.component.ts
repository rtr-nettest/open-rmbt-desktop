import { Component } from "@angular/core"
import { MainStore } from "./store/main.store"

@Component({
    selector: "app-root",
    templateUrl: "./app.component.html",
    styleUrls: ["./app.component.scss"],
    standalone: false
})
export class AppComponent {
    inProgress$ = this.store.inProgress$

    constructor(private store: MainStore) {}
}
