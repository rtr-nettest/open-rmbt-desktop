import { Component } from "@angular/core"
import { Router } from "@angular/router"
import { MainStore } from "src/app/store/main.store"

@Component({
    selector: "app-news",
    templateUrl: "./news-screen.component.html",
    styleUrls: ["./news-screen.component.scss"],
})
export class NewsScreenComponent {
    news$ = this.mainStore.news$

    constructor(private mainStore: MainStore, private router: Router) {}

    close() {
        this.router.navigateByUrl("/")
    }
}
