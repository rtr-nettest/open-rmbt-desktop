import { HttpClient } from "@angular/common/http"
import { Injectable } from "@angular/core"
import { TranslocoService } from "@ngneat/transloco"
import { buffer, catchError, map, of } from "rxjs"

@Injectable({
    providedIn: "root",
})
export class AssetsService {
    constructor(
        private transloco: TranslocoService,
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
