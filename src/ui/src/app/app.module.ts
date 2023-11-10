import { APP_INITIALIZER, NgModule } from "@angular/core"
import { BrowserModule } from "@angular/platform-browser"
import { BrowserAnimationsModule } from "@angular/platform-browser/animations"

import { AppRoutingModule } from "./app-routing.module"
import { AppComponent } from "./app.component"
import { HomeScreenComponent } from "./screens/home-screen/home-screen.component"
import { TestScreenComponent } from "./screens/test-screen/test-screen.component"
import { ResultScreenComponent } from "./screens/result-screen/result-screen.component"
import { HeaderComponent } from "./widgets/header/header.component"
import { FooterComponent } from "./widgets/footer/footer.component"
import { StartTestButtonComponent } from "./widgets/start-test-button/start-test-button.component"
import { GaugeComponent } from "./widgets/gauge/gauge.component"
import { InterimResultsComponent } from "./widgets/interim-results/interim-results.component"
import { DlComponent } from "./widgets/dl/dl.component"
import { SpacerComponent } from "./widgets/spacer/spacer.component"
import { IBasicNetworkInfo } from "../../../measurement/interfaces/basic-network-info.interface"
import { IMeasurementPhaseState } from "../../../measurement/interfaces/measurement-phase-state.interface"
import { ISimpleHistoryResult } from "../../../measurement/interfaces/simple-history-result.interface"
import { IUserSettings } from "../../../measurement/interfaces/user-settings-response.interface"
import { IEnv } from "../../../electron/interfaces/env.interface"
import { MatIconModule } from "@angular/material/icon"
import { MatButtonModule } from "@angular/material/button"
import { MatTooltipModule } from "@angular/material/tooltip"
import { MatSnackBarModule } from "@angular/material/snack-bar"
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner"
import { MatProgressBarModule } from "@angular/material/progress-bar"
import { HttpClientModule } from "@angular/common/http"
import { TranslocoRootModule } from "./transloco-root.module"
import { TestHeaderComponent } from "./widgets/test-header/test-header.component"
import { TestIndicatorComponent } from "./widgets/test-indicator/test-indicator.component"
import { TestBoxesComponent } from "./widgets/test-boxes/test-boxes.component"
import { TestChartComponent } from "./widgets/test-chart/test-chart.component"
import { TestChartsComponent } from "./widgets/test-charts/test-charts.component"
import { ICPU } from "../../../measurement/interfaces/cpu.interface"
import {
    Chart,
    // ArcElement,
    LineElement,
    BarElement,
    PointElement,
    BarController,
    // BubbleController,
    // DoughnutController,
    LineController,
    // PieController,
    // PolarAreaController,
    // RadarController,
    // ScatterController,
    CategoryScale,
    LinearScale,
    // LogarithmicScale,
    // RadialLinearScale,
    TimeScale,
    // TimeSeriesScale,
    // Decimation,
    Filler,
    // Title,
} from "chart.js"
import "chartjs-adapter-dayjs-4/dist/chartjs-adapter-dayjs-4.esm"
import { HomeMetricsComponent } from "./widgets/home-metrics/home-metrics.component"
import { MainContentComponent } from "./widgets/main-content/main-content.component"
import { MainMenuComponent } from "./widgets/main-menu/main-menu.component"
import { MainMenuItemComponent } from "./widgets/main-menu-item/main-menu-item.component"
import { BodyComponent } from "./widgets/body/body.component"
import { ConfirmDialogComponent } from "./widgets/confirm-dialog/confirm-dialog.component"
import { MatDialogModule } from "@angular/material/dialog"
import { ExportWarningComponent } from "./widgets/export-warning/export-warning.component"
import { TermsConditionsScreenComponent } from "./screens/terms-conditions-screen/terms-conditions-screen.component"
import { ICrowdinJson } from "../../../measurement/interfaces/crowdin.interface"
import { INewsItem } from "../../../measurement/interfaces/news.interface"
import { SettingsScreenComponent } from "./screens/settings-screen/settings-screen.component"
import { NewsScreenComponent } from "./screens/news-screen/news-screen.component"
import { MatInputModule } from "@angular/material/input"
import { MatTableModule } from "@angular/material/table"
import { MatSortModule } from "@angular/material/sort"
import { MatPaginatorModule } from "@angular/material/paginator"
import { MatSlideToggleModule } from "@angular/material/slide-toggle"
import { MatSelectModule } from "@angular/material/select"
import { TableComponent } from "./widgets/table/table.component"
import { PaginatorComponent } from "./widgets/paginator/paginator.component"
import { DynamicComponentDirective } from "./directives/dynamic-component.directive"
import { SettingsUuidComponent } from "./widgets/settings-uuid/settings-uuid.component"
import { SettingsVersionComponent } from "./widgets/settings-version/settings-version.component"
import { SettingsRepoLinkComponent } from "./widgets/settings-repo-link/settings-repo-link.component"
import { SettingsIpComponent } from "./widgets/settings-ip/settings-ip.component"
import { SettingsLocaleComponent } from "./widgets/settings-locale/settings-locale.component"
import { FormsModule, ReactiveFormsModule } from "@angular/forms"
import { EIPVersion } from "../../../measurement/enums/ip-version.enum"
import { MainStore } from "./store/main.store"
import { HistoryScreenComponent } from "./screens/history-screen/history-screen.component"
import { ActionButtonsComponent } from "./widgets/action-buttons/action-buttons.component"
import { ScrollTopComponent } from "./widgets/scroll-top/scroll-top.component"
import localeDe from "@angular/common/locales/de"
import localeNb from "@angular/common/locales/nb"
import localeSq from "@angular/common/locales/sq"
import localeSk from "@angular/common/locales/sk"
import localeSr from "@angular/common/locales/sr"
import localeSrLatn from "@angular/common/locales/sr-Latn"
import localeSrMeLatn from "@angular/common/locales/sr-Latn-ME"
import { DatePipe, registerLocaleData } from "@angular/common"
import { HeaderMenuComponent } from "./widgets/header-menu/header-menu.component"
import { IMeasurementServerResponse } from "../../../measurement/interfaces/measurement-server-response.interface"
import { TestServersComponent } from "./widgets/test-servers/test-servers.component"
import { DistancePipe } from "./pipes/distance.pipe"
import { ClientScreenComponent } from "./screens/client-screen/client-screen.component"
import { ClientSelectComponent } from "./widgets/client-select/client-select.component"
import { IPaginator } from "./interfaces/paginator.interface"
import { ISort } from "./interfaces/sort.interface"
import { ScrollBottomComponent } from "./widgets/scroll-bottom/scroll-bottom.component"
import { SettingsLocalDataComponent } from "./widgets/settings-local-data/settings-local-data.component"
import { StatisticsScreenComponent } from "./screens/statistics-screen/statistics-screen.component"
import { MapScreenComponent } from "./screens/map-screen/map-screen.component"
import { LoopStartScreenComponent } from "./screens/loop-start-screen/loop-start-screen.component"
import { SprintfPipe } from "./pipes/sprintf.pipe"
import { AlertComponent } from "./widgets/alert/alert.component"
import { StopLoopButtonComponent } from "./widgets/stop-loop-button/stop-loop-button.component"
import { ILoopModeInfo } from "../../../measurement/interfaces/measurement-registration-request.interface"
import { RecentHistoryComponent } from "./widgets/recent-history/recent-history.component"
import { ERoutes } from "./enums/routes.enum"
import { ExpandArrowComponent } from "./widgets/expand-arrow/expand-arrow.component"
import { RouterLinkComponent } from "./widgets/router-link/router-link.component"
import { LoopResultScreenComponent } from "./screens/loop-result-screen/loop-result-screen.component"
import { LoopTestScreenComponent } from "./screens/loop-test-screen/loop-test-screen.component"
import { TranslatePipe } from "./pipes/translate.pipe"
import { MarkdownModule } from "ngx-markdown"
import { SocialButtonsComponent } from "./widgets/social-buttons/social-buttons.component"

Chart.register(
    BarElement,
    BarController,
    LineElement,
    PointElement,
    LineController,
    CategoryScale,
    LinearScale,
    TimeScale,
    Filler
)

declare global {
    interface Window {
        electronAPI: {
            quit: () => Promise<void>
            getTranslations: (lang: string) => Promise<ICrowdinJson | null>
            getNews: () => Promise<INewsItem[] | null>
            acceptTerms: (terms: number) => Promise<void>
            registerClient: () => Promise<IUserSettings>
            setIpVersion: (ipv: EIPVersion | null) => Promise<void>
            setActiveClient: (client: string) => Promise<void>
            setActiveLanguage: (language: string) => Promise<void>
            setActiveServer: (
                server: IMeasurementServerResponse | null
            ) => Promise<void>
            setDefaultLanguage: (language: string) => Promise<void>
            runMeasurement: (loopModeInfo?: ILoopModeInfo) => Promise<void>
            abortMeasurement: () => Promise<void>
            getServers: () => Promise<IMeasurementServerResponse[]>
            getEnv: () => Promise<IEnv>
            getCPUUsage: () => Promise<ICPU>
            getMeasurementState: () => Promise<
                IMeasurementPhaseState & IBasicNetworkInfo
            >
            getMeasurementResult: (
                testUuid: string
            ) => Promise<ISimpleHistoryResult>
            getMeasurementHistory: (
                paginator?: IPaginator,
                sort?: ISort
            ) => Promise<ISimpleHistoryResult[]>
            onError: (callback: (error: Error) => any) => Promise<any>
            onMeasurementAborted: (callback: () => any) => Promise<any>
            offMeasurementAborted: () => Promise<any>
            onOpenScreen: (callback: (route: ERoutes) => any) => Promise<any>
            onRestartMeasurement: (
                callback: (loopCounter: number) => any
            ) => Promise<any>
            onLoopModeExpired: (callback: () => any) => Promise<any>
            deleteLocalData: () => Promise<void>
            scheduleLoop: (
                loopInterval: number,
                loopModeInfo: ILoopModeInfo
            ) => Promise<void>
        }
    }
}

@NgModule({
    declarations: [
        AppComponent,
        BodyComponent,
        DistancePipe,
        DlComponent,
        ExportWarningComponent,
        FooterComponent,
        GaugeComponent,
        HeaderComponent,
        HomeMetricsComponent,
        HomeScreenComponent,
        InterimResultsComponent,
        MainContentComponent,
        MainMenuComponent,
        MainMenuItemComponent,
        ResultScreenComponent,
        SpacerComponent,
        StartTestButtonComponent,
        TableComponent,
        TestBoxesComponent,
        TestChartComponent,
        TestChartsComponent,
        TestHeaderComponent,
        TestIndicatorComponent,
        TestScreenComponent,
        ConfirmDialogComponent,
        TermsConditionsScreenComponent,
        NewsScreenComponent,
        SettingsScreenComponent,
        PaginatorComponent,
        SettingsUuidComponent,
        SettingsVersionComponent,
        SettingsRepoLinkComponent,
        DynamicComponentDirective,
        SettingsIpComponent,
        SettingsLocaleComponent,
        HistoryScreenComponent,
        ActionButtonsComponent,
        ScrollTopComponent,
        HeaderMenuComponent,
        TestServersComponent,
        ClientScreenComponent,
        ClientSelectComponent,
        ScrollBottomComponent,
        SettingsLocalDataComponent,
        StatisticsScreenComponent,
        MapScreenComponent,
        LoopStartScreenComponent,
        SprintfPipe,
        AlertComponent,
        StopLoopButtonComponent,
        RecentHistoryComponent,
        ExpandArrowComponent,
        RouterLinkComponent,
        LoopResultScreenComponent,
        LoopTestScreenComponent,
        TranslatePipe,
        SocialButtonsComponent,
    ],
    imports: [
        AppRoutingModule,
        BrowserAnimationsModule,
        BrowserModule,
        FormsModule,
        ReactiveFormsModule,
        HttpClientModule,
        MarkdownModule.forRoot(),
        MatButtonModule,
        MatDialogModule,
        MatIconModule,
        MatInputModule,
        MatPaginatorModule,
        MatProgressBarModule,
        MatProgressSpinnerModule,
        MatSnackBarModule,
        MatTableModule,
        MatSortModule,
        MatTooltipModule,
        MatSlideToggleModule,
        MatSelectModule,
        TranslocoRootModule,
    ],
    bootstrap: [AppComponent],
    providers: [
        {
            provide: APP_INITIALIZER,
            useFactory: MainStore.factory,
            deps: [MainStore],
            multi: true,
        },
        {
            provide: DatePipe,
        },
        {
            provide: SprintfPipe,
        },
    ],
})
export class AppModule {
    constructor() {
        registerLocaleData(localeNb)
        registerLocaleData(localeSq)
        registerLocaleData(localeSk)
        registerLocaleData(localeSr)
        registerLocaleData(localeSrLatn)
        registerLocaleData(localeDe)
        registerLocaleData(localeSrMeLatn)
    }
}
