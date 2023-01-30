import { ChangeDetectionStrategy, Component } from "@angular/core"
import { MainStore } from "src/app/store/main.store"

@Component({
    selector: "app-footer",
    templateUrl: "./footer.component.html",
    styleUrls: ["./footer.component.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooterComponent {
    env$ = this.mainStore.env$

    constructor(private mainStore: MainStore) {}
}
