import { Component } from "@angular/core"
import { MainStore } from "src/app/store/main.store"

@Component({
    selector: "app-certified-screen",
    templateUrl: "./certified-screen.component.html",
    styleUrls: ["./certified-screen.component.scss"],
})
export class CertifiedScreenComponent {
    env$ = this.mainStore.env$

    constructor(private mainStore: MainStore) {}
}
