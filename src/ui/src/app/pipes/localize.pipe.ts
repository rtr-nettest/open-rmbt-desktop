import {
    ChangeDetectorRef,
    OnDestroy,
    Pipe,
    PipeTransform,
} from "@angular/core"
import { Subscription } from "rxjs"
import { I18nService } from "../services/i18n.service"

/**
 * Translates a key, mirroring Transloco's `| transloco` pipe. Impure so it keeps
 * the rendered string in sync with language changes (named `localize` to avoid
 * clashing with the existing markdown `translate` pipe).
 */
@Pipe({
    name: "localize",
    standalone: false,
    pure: false,
})
export class LocalizePipe implements PipeTransform, OnDestroy {
    private lastKey?: string
    private value = ""
    private sub?: Subscription

    constructor(
        private i18n: I18nService,
        private cdr: ChangeDetectorRef,
    ) {}

    transform(key: string): string {
        if (key !== this.lastKey) {
            this.lastKey = key
            this.value = this.i18n.translate(key)
            this.sub?.unsubscribe()
            this.sub = this.i18n.selectTranslation().subscribe(() => {
                this.value = this.i18n.translate(key)
                this.cdr.markForCheck()
            })
        }
        return this.value
    }

    ngOnDestroy(): void {
        this.sub?.unsubscribe()
    }
}
