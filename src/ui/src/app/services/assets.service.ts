import { HttpClient } from "@angular/common/http"
import { Injectable } from "@angular/core"
import { I18nService } from "src/app/services/i18n.service"
import { buffer, catchError, map, of } from "rxjs"

@Injectable({
    providedIn: "root",
})
export class AssetsService {
    constructor(
        private transloco: I18nService,
        private http: HttpClient
    ) {}

    getLocalizedHtml(name: string) {
        return this.http
            .get(
                `/assets/html/${name}.${this.transloco.getActiveLang()}.html`,
                {
                    responseType: "arraybuffer",
                }
            )
            .pipe(
                map((buffer) => new TextDecoder("utf-8").decode(buffer)),
                catchError((err) => {
                    console.warn(err)
                    return of("")
                })
            )
    }
}
