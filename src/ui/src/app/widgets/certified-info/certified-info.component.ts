import { Component } from "@angular/core"
import { AssetsService } from "src/app/services/assets.service"

@Component({
    selector: "app-certified-info",
    templateUrl: "./certified-info.component.html",
    styleUrls: ["./certified-info.component.scss"],
    standalone: false
})
export class CertifiedInfoComponent {
    data$ = this.assets.getLocalizedHtml("certified-measurement")

    constructor(private assets: AssetsService) {}
}
