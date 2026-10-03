import { Component, Input, ChangeDetectionStrategy } from "@angular/core"
import { ITestPhaseState } from "../../interfaces/test-phase-state.interface"
import { ETestStatuses } from "../../enums/test-statuses.enum"
import { I18nService } from "src/app/services/i18n.service"
import { ConversionService } from "src/app/services/conversion.service"

@Component({
    selector: "nt-test-indicator",
    templateUrl: "./test-indicator.component.html",
    styleUrls: ["./test-indicator.component.scss"],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false,
})
export class TestIndicatorComponent {
    @Input() data: ITestPhaseState | undefined

    get counter() {
        let parsedVal = Number(this.data?.counter)
        if (!isNaN(parsedVal)) {
            const retVal = this.conversion.convertMs(parsedVal)
            return retVal >= 0 ? retVal.toLocaleString() : "-"
        }
        return "-"
    }

    get isActive() {
        return this.data && this.data.container === ETestStatuses.ACTIVE
    }

    get isDone() {
        return this.data && this.data.container === ETestStatuses.DONE
    }

    get label() {
        return (
            this.data &&
            this.data.label &&
            this.transloco.translate(`test.${this.data.label}.label`)
        )
    }

    get units() {
        return (
            this.data &&
            this.data.label &&
            this.transloco.translate(`test.${this.data.label}.units`)
        )
    }

    constructor(
        private transloco: I18nService,
        private conversion: ConversionService,
    ) {}
}
