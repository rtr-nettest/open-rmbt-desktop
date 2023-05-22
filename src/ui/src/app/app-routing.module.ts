import { NgModule } from "@angular/core"
import { RouterModule, Routes } from "@angular/router"
import { HomeScreenComponent } from "./screens/home-screen/home-screen.component"
import { ResultScreenComponent } from "./screens/result-screen/result-screen.component"
import { TestScreenComponent } from "./screens/test-screen/test-screen.component"
import { ERoutes } from "./enums/routes.enum"

const routes: Routes = [
    {
        path: ERoutes.TEST,
        component: TestScreenComponent,
    },
    {
        path: ERoutes.TEST_RESULT,
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
