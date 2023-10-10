import { Injectable } from "@angular/core"
import { Router } from "@angular/router"
import { TranslocoService } from "@ngneat/transloco"
import { Observable, from, map } from "rxjs"
import { TranslocoConfigExt } from "src/transloco.config"
import { IEnv } from "../../../../electron/interfaces/env.interface"
import { ERoutes } from "../enums/routes.enum"

@Injectable({
    providedIn: "root",
})
export class EnvResolver {
    constructor(private transloco: TranslocoService, private router: Router) {}

    resolve(): Observable<boolean> {
        return from(window.electronAPI.getEnv()).pipe(
            map((env) => {
                this.resolveLang(env)
                return this.resolveClient(env)
            })
        )
    }

    private resolveLang(env: IEnv) {
        const storedLanguage = env?.ACTIVE_LANGUAGE
        if (TranslocoConfigExt["availableLangs"].includes(storedLanguage)) {
            this.transloco.setActiveLang(storedLanguage!)
        }
    }

    private resolveClient(env: IEnv) {
        if (!env?.X_NETTEST_CLIENT && env?.FLAVOR === "ont") {
            this.router.navigate(["/", ERoutes.CLIENT])
            return false
        }
        return true
    }
}
