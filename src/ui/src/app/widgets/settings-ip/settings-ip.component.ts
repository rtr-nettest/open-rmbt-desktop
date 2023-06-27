import { Component, Input } from "@angular/core"
import { MatSlideToggleChange } from "@angular/material/slide-toggle"
import { map } from "rxjs"
import {
    IDynamicComponent,
    IDynamicComponentParameters,
} from "src/app/interfaces/dynamic-component.interface"
import { MainStore } from "src/app/store/main.store"

@Component({
    selector: "app-settings-ip",
    templateUrl: "./settings-ip.component.html",
    styleUrls: ["./settings-ip.component.scss"],
})
export class SettingsIpComponent implements IDynamicComponent {
    @Input() parameters?: IDynamicComponentParameters

    checked$ = this.store.ipVersion$.pipe(
        map(
            (v) =>
                !!this.parameters?.["ipVersion"] &&
                v === this.parameters?.["ipVersion"]
        )
    )

    constructor(private store: MainStore) {}

    change(event: MatSlideToggleChange) {
        if (event.checked) {
            this.store.setIPVersion(this.parameters?.["ipVersion"])
        } else {
            this.store.setIPVersion()
        }
    }
}
