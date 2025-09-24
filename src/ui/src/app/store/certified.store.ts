import { Injectable } from "@angular/core"

@Injectable({
    providedIn: "root",
})
export class CertifiedStore {
    files: { [key: string]: File } = {}
}
