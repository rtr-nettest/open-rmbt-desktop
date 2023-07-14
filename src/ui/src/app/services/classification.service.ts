import { Injectable } from "@angular/core"

@Injectable({
    providedIn: "root",
})
export class ClassificationService {
    constructor() {}

    getIconByClass(classification?: number) {
        switch (classification) {
            case 1:
                return '<i class="app-icon--class app-icon--class-red"></i>'
            case 2:
                return '<i class="app-icon--class app-icon--class-yellow"></i>'
            case 3:
                return '<i class="app-icon--class app-icon--class-green"></i>'
            case 4:
                return '<i class="app-icon--class app-icon--class-greenest"></i>'
            default:
                return ""
        }
    }
}
