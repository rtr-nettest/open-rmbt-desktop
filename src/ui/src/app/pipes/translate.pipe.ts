import { Pipe, PipeTransform } from "@angular/core"
import { marked } from "marked"
import { ITranslatable } from "../interfaces/translatable.interface"
import { I18nService } from "src/app/services/i18n.service"

@Pipe({
    name: "translate",
    standalone: false
})
export class TranslatePipe implements PipeTransform {
    constructor(private transloco: I18nService) {}

    transform(
        value: ITranslatable,
        key: string,
        parseMarkdown: "parseMarkdown" | "skipMarkdown" = "skipMarkdown"
    ): string {
        let retVal = value && value[key]
        if (value && value.translations) {
            const translation = value.translations.find(
                (t) => t.language === this.transloco.getActiveLang()
            )
            if (translation && translation[key]) {
                retVal = translation[key]
            }
        }
        if (parseMarkdown === "parseMarkdown") {
            // Synchronous render; the result is bound via [innerHTML], which
            // Angular sanitizes.
            return marked.parse(retVal ?? "", { async: false }) as string
        }
        return retVal
    }
}
