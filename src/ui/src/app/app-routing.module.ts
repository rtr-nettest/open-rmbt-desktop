import { NgModule } from "@angular/core"
import { RouterModule, Routes } from "@angular/router"
import { HomeScreenComponent } from "./screens/home-screen/home-screen.component"
import { ResultScreenComponent } from "./screens/result-screen/result-screen.component"
import { TestScreenComponent } from "./screens/test-screen/test-screen.component"

const routes: Routes = [
    {
        path: "test",
        component: TestScreenComponent,
    },
    {
        path: "result/:testUuid",
        component: ResultScreenComponent,
    },
    {
        path: "**",
        component: HomeScreenComponent,
        pathMatch: "full",
    },
]

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule],
})
export class AppRoutingModule {}
