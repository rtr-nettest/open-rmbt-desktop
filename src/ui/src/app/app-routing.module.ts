import { NgModule, inject } from "@angular/core"
import { RouterModule, Routes } from "@angular/router"
import { HomeScreenComponent } from "./screens/home-screen/home-screen.component"
import { ResultScreenComponent } from "./screens/result-screen/result-screen.component"
import { TestScreenComponent } from "./screens/test-screen/test-screen.component"
import { ERoutes } from "./enums/routes.enum"
import { TermsConditionsScreenComponent } from "./screens/terms-conditions-screen/terms-conditions-screen.component"
import { NewsResolver } from "./resolvers/news.resolver"
import { SettingsScreenComponent } from "./screens/settings-screen/settings-screen.component"
import { NewsScreenComponent } from "./screens/news-screen/news-screen.component"
import { EnvResolver } from "./resolvers/env.resolver"

const routes: Routes = [
    {
        path: ERoutes.TERMS_CONDITIONS,
        component: TermsConditionsScreenComponent,
    },
    {
        path: ERoutes.TEST,
        component: TestScreenComponent,
    },
    {
        path: ERoutes.TEST_RESULT,
        component: ResultScreenComponent,
    },
    {
        path: ERoutes.NEWS,
        component: NewsScreenComponent,
    },
    {
        path: ERoutes.SETTINGS,
        component: SettingsScreenComponent,
    },
    {
        path: "**",
        component: HomeScreenComponent,
        resolve: {
            env: () => inject(EnvResolver).resolve(),
            news: () => inject(NewsResolver).resolve(),
        },
        pathMatch: "full",
    },
]

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule],
})
export class AppRoutingModule {}
