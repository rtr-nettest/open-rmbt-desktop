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
import { HistoryScreenComponent } from "./screens/history-screen/history-screen.component"
import { ReferrerResolver } from "./resolvers/referrer.resolver"
import { ClientScreenComponent } from "./screens/client-screen/client-screen.component"
import { StatisticsScreenComponent } from "./screens/statistics-screen/statistics-screen.component"
import { MapScreenComponent } from "./screens/map-screen/map-screen.component"
import { LoopStartScreenComponent } from "./screens/loop-start-screen/loop-start-screen.component"
import { LoopResultScreenComponent } from "./screens/loop-result-screen/loop-result-screen.component"
import { MeasurementResolver } from "./resolvers/measurement.resolver"
import { LoopTestScreenComponent } from "./screens/loop-test-screen/loop-test-screen.component"

const routes: Routes = [
    {
        path: ERoutes.TERMS_CONDITIONS,
        component: TermsConditionsScreenComponent,
    },
    {
        path: ERoutes.TEST,
        component: TestScreenComponent,
        resolve: {
            measurementAborted: () => inject(MeasurementResolver).resolve(),
        },
    },
    {
        path: ERoutes.TEST_RESULT,
        component: ResultScreenComponent,
        resolve: {
            refferer: () => inject(ReferrerResolver).resolve(),
            measurementAborted: () => inject(MeasurementResolver).resolve(),
        },
    },
    {
        path: ERoutes.HISTORY,
        component: HistoryScreenComponent,
        resolve: {
            measurementAborted: () => inject(MeasurementResolver).resolve(),
        },
    },
    {
        path: ERoutes.NEWS,
        component: NewsScreenComponent,
    },
    {
        path: ERoutes.SETTINGS,
        component: SettingsScreenComponent,
        resolve: {
            measurementAborted: () => inject(MeasurementResolver).resolve(),
        },
    },
    {
        path: ERoutes.CLIENT,
        component: ClientScreenComponent,
    },
    {
        path: ERoutes.STATISTICS,
        component: StatisticsScreenComponent,
        resolve: {
            measurementAborted: () => inject(MeasurementResolver).resolve(),
        },
    },
    {
        path: ERoutes.MAP,
        component: MapScreenComponent,
        resolve: {
            measurementAborted: () => inject(MeasurementResolver).resolve(),
        },
    },
    {
        path: ERoutes.LOOP_MODE,
        component: LoopStartScreenComponent,
        resolve: {
            measurementAborted: () => inject(MeasurementResolver).resolve(),
        },
    },
    {
        path: ERoutes.LOOP_TEST,
        component: LoopTestScreenComponent,
    },
    {
        path: ERoutes.LOOP_RESULT,
        component: LoopResultScreenComponent,
        resolve: {
            measurementAborted: () => inject(MeasurementResolver).resolve(),
        },
    },
    {
        path: "**",
        component: HomeScreenComponent,
        resolve: {
            env: () => inject(EnvResolver).resolve(),
            news: () => inject(NewsResolver).resolve(),
            measurementAborted: () => inject(MeasurementResolver).resolve(),
        },
        pathMatch: "full",
    },
]

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule],
})
export class AppRoutingModule {}
