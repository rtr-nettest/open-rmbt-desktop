import { Component } from "@angular/core"
import { Router } from "@angular/router"
import { MainStore } from "src/app/store/main.store"

@Component({
    selector: "app-news",
    templateUrl: "./news.component.html",
    styleUrls: ["./news.component.scss"],
})
export class NewsComponent {
    news$ = this.mainStore.news$

    constructor(private mainStore: MainStore, private router: Router) {}

    close() {
        this.router.navigateByUrl("/")
    }
}
