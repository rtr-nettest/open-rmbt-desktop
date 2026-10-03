import {
    Directive,
    OnDestroy,
    OnInit,
    TemplateRef,
    ViewContainerRef,
} from "@angular/core"
import { Subscription } from "rxjs"
import { I18nService } from "../services/i18n.service"

/**
 * Structural directive mirroring Transloco's `*transloco="let t"`: exposes a
 * translate function `t(key)` to the template and re-renders when the language
 * changes.
 *
 *   <h1 *localize="let t">{{ t("Measurement") }}</h1>
 */
@Directive({
    selector: "[localize]",
    standalone: false,
})
export class LocalizeDirective implements OnInit, OnDestroy {
    private sub?: Subscription

    constructor(
        private tpl: TemplateRef<{ $implicit: (key: string) => string }>,
        private vcr: ViewContainerRef,
        private i18n: I18nService,
    ) {}

    ngOnInit(): void {
        // Re-render the whole template on each language change so the embedded
        // t() calls re-evaluate regardless of the host's change-detection mode.
        this.sub = this.i18n.selectTranslation().subscribe(() => this.render())
    }

    private render(): void {
        this.vcr.clear()
        const t = (key: string) => this.i18n.translate(key)
        this.vcr.createEmbeddedView(this.tpl, { $implicit: t })
    }

    ngOnDestroy(): void {
        this.sub?.unsubscribe()
    }
}
