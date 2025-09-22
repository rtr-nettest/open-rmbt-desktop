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
            const ping =
                state.phases[EMeasurementStatus.DOWN].ping != null
                    ? this.conversionService.getSignificantDigits(
                          state.phases[EMeasurementStatus.DOWN].ping,
                      )
                    : -1
            this.ping =
                ping < 0
                    ? "-"
                    : ping.toLocaleString(locale) +
                      " " +
                      this.transloco.translate("ms")
            const download =
                state.phases[EMeasurementStatus.DOWN].down != null
                    ? this.conversionService.getSignificantDigits(
                          state.phases[EMeasurementStatus.DOWN].down,
                      )
                    : -1
            this.download =
                download < 0
                    ? "-"
                    : download.toLocaleString(locale) +
                      " " +
                      this.transloco.translate("Mbps")
            const upload =
                state.phases[EMeasurementStatus.UP].up != null
                    ? this.conversionService.getSignificantDigits(
                          state.phases[EMeasurementStatus.UP].up,
                      )
                    : -1
            this.upload =
                upload < 0
                    ? "-"
                    : upload.toLocaleString(locale) +
                      " " +
                      this.transloco.translate("Mbps")
        }),
    )

    ping: string = "-"
    download: string = "-"
    upload: string = "-"

    phases = EMeasurementStatus

    constructor(
        private conversionService: ConversionService,
        private store: TestStore,
        private transloco: TranslocoService,
    ) {}
}
