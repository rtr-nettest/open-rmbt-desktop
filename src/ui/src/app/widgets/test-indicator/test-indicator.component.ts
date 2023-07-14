import { Component, Input } from "@angular/core"
import { ITestPhaseState } from "../../interfaces/test-phase-state.interface"
import { ETestStatuses } from "../../enums/test-statuses.enum"
import { TranslocoService } from "@ngneat/transloco"
import { ConversionService } from "src/app/services/conversion.service"

@Component({
    selector: "nt-test-indicator",
    templateUrl: "./test-indicator.component.html",
    styleUrls: ["./test-indicator.component.scss"],
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
        private transloco: TranslocoService,
        private conversion: ConversionService
    ) {}
}
