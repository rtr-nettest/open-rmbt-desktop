import { Input } from "@angular/core"
import { Component } from "@angular/core"
import { MatSelectChange } from "@angular/material/select"
import { TranslocoService } from "@ngneat/transloco"
import {
    IDynamicComponent,
    IDynamicComponentParameters,
} from "src/app/interfaces/dynamic-component.interface"
import { ILocale } from "src/app/interfaces/locale.interface"
import { TranslocoConfigExt } from "src/transloco.config"

@Component({
    selector: "app-settings-locale",
    templateUrl: "./settings-locale.component.html",
    styleUrls: ["./settings-locale.component.scss"],
})
export class SettingsLocaleComponent implements IDynamicComponent {
    @Input() parameters?: IDynamicComponentParameters
    locales = TranslocoConfigExt["availableLocales"]
    selectedLocale = this.locales.find(
        (l: ILocale) => l.iso === this.transloco.getActiveLang()
    )

    constructor(private transloco: TranslocoService) {}

    change(event: MatSelectChange) {
        this.transloco.setActiveLang(event.value.iso)
        window.electronAPI.setActiveLanguage(event.value.iso)
    }
}
