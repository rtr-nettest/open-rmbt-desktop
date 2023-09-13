import { Component } from "@angular/core"
import { map, withLatestFrom } from "rxjs"
import { MessageService } from "src/app/services/message.service"
import { MainStore } from "src/app/store/main.store"

@Component({
    selector: "app-settings-uuid",
    templateUrl: "./settings-uuid.component.html",
    styleUrls: ["./settings-uuid.component.scss"],
})
export class SettingsUuidComponent {
    uuid$ = this.store.settings$.pipe(
        withLatestFrom(this.store.env$),
        map(([settings, env]) => {
            if (env?.FLAVOR === "ont") {
                return settings?.uuid
            }
            return "U" + settings?.uuid
        })
    )

    constructor(private store: MainStore, private message: MessageService) {}

    copy(uuid: string) {
        window.navigator.clipboard
            .writeText(uuid)
            .then(() => {
                this.message.openSnackbar(
                    "Client UUID was copied to the clipboard."
                )
            })
            .catch((e) => {
                this.message.openSnackbar(e)
            })
    }
}
