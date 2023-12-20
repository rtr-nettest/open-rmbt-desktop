import { Injectable } from "@angular/core"

@Injectable({
    providedIn: "root",
})
export class ClassificationService {
    constructor() {}

    getPhaseIconByClass(
        phase: "down" | "up" | "ping",
        classification?: number
    ) {
        switch (classification) {
            case 1:
                return `<i class="app-icon--phase app-icon--phase-${phase}-red"></i>`
            case 2:
                return `<i class="app-icon--phase app-icon--phase-${phase}-yellow"></i>`
            case 3:
                return `<i class="app-icon--phase app-icon--phase-${phase}-green"></i>`
            case 4:
                return `<i class="app-icon--phase app-icon--phase-${phase}-greenest"></i>`
            default:
                return `<i class="app-icon--phase app-icon--phase-${phase}"`
        }
    }
}
