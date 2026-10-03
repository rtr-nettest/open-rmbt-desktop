import { Input, ChangeDetectionStrategy } from "@angular/core"
import { Component } from "@angular/core"
import { MatSelectChange } from "@angular/material/select"
import { I18nService } from "src/app/services/i18n.service"
import {
    IDynamicComponent,
    IDynamicComponentParameters,
} from "src/app/interfaces/dynamic-component.interface"
import { ILocale } from "src/app/interfaces/locale.interface"
import { I18N_CONFIG } from "src/i18n.config"

@Component({
    selector: "app-settings-locale",
    templateUrl: "./settings-locale.component.html",
    styleUrls: ["./settings-locale.component.scss"],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false,
})
export class SettingsLocaleComponent implements IDynamicComponent {
    @Input() parameters?: IDynamicComponentParameters
    locales = I18N_CONFIG["availableLocales"]
    selectedLocale = this.locales.find(
        (l: ILocale) => l.iso === this.transloco.getActiveLang(),
    )

    constructor(private transloco: I18nService) {}

    change(event: MatSelectChange) {
        this.transloco.setActiveLang(event.value.iso)
        window.electronAPI.setActiveLanguage(event.value.iso)
    }
}
