import { ChangeDetectionStrategy, Component } from "@angular/core"
import { tap } from "rxjs"
import { TestStore } from "src/app/store/test.store"
import { EMeasurementStatus } from "../../../../../measurement/enums/measurement-status.enum"
import { TranslocoService } from "@ngneat/transloco"
import { ConversionService } from "src/app/services/conversion.service"

@Component({
    selector: "app-interim-results",
    templateUrl: "./interim-results.component.html",
    styleUrls: ["./interim-results.component.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterimResultsComponent {
    visualization$ = this.store.visualization$.pipe(
        tap((state) => {
            const locale = this.transloco.getActiveLang()
            const ping = this.conversionService.getSignificantDigits(
                state.phases[EMeasurementStatus.DOWN].ping
            )
            this.ping =
                ping < 0
                    ? "-"
                    : ping.toLocaleString(locale) +
                      " " +
                      this.transloco.translate("ms")
            const download = this.conversionService.getSignificantDigits(
                state.phases[EMeasurementStatus.DOWN].down
            )
            this.download =
                download < 0
                    ? "-"
                    : download.toLocaleString(locale) +
                      " " +
                      this.transloco.translate("Mbps")
            const upload = this.conversionService.getSignificantDigits(
                state.phases[EMeasurementStatus.UP].up
            )
            this.upload =
                upload < 0
                    ? "-"
                    : upload.toLocaleString(locale) +
                      " " +
                      this.transloco.translate("Mbps")
        })
    )

    ping: string = "-"
    download: string = "-"
    upload: string = "-"

    phases = EMeasurementStatus

    constructor(
        private conversionService: ConversionService,
        private store: TestStore,
        private transloco: TranslocoService
    ) {}
}
