import { Component } from "@angular/core"
import { MainStore } from "src/app/store/main.store"

@Component({
    selector: "app-certified-screen",
    templateUrl: "./certified-screen.component.html",
    styleUrls: ["./certified-screen.component.scss"],
})
export class CertifiedScreenComponent {
    activeBreadCrumbIndex = 0
    breadCrumbs = ["Info", "Data", "Environment", "Measurement", "Result"]
    env$ = this.mainStore.env$

    constructor(private mainStore: MainStore) {}

    nextBreadCrumb() {
        if (this.activeBreadCrumbIndex >= this.breadCrumbs.length - 1) {
            return
        }
        this.activeBreadCrumbIndex++
    }
}
