import { Component, Input } from "@angular/core"

@Component({
    selector: "app-dl",
    templateUrl: "./dl.component.html",
    styleUrls: ["./dl.component.scss"],
})
export class DlComponent {
    @Input() items?: { [key: string]: string }
    @Input() icons?: { [key: string]: string[] }

    get entries() {
        return this.items ? Object.entries(this.items) : null
    }
}
