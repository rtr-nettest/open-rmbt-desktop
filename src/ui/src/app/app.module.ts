import { NgModule } from "@angular/core"
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
    // TimeScale,
    // TimeSeriesScale,
    // Decimation,
    Filler,
    // Title,
} from "chart.js";
import { HomeMetricsComponent } from './widgets/home-metrics/home-metrics.component'
Chart.register(
    BarElement,
    BarController,
    LineElement,
    PointElement,
    LineController,
    CategoryScale,
    LinearScale,
    Filler
)

declare global {
    interface Window {
        electronAPI: {
            registerClient: () => Promise<IUserSettings>
            runMeasurement: () => Promise<void>
            getEnv: () => Promise<IEnv>
            getBasicNetworkInfo: () => Promise<IBasicNetworkInfo>
            getCPUUsage: () => Promise<ICPU>
            getMeasurementState: () => Promise<IMeasurementPhaseState>
            getMeasurementResult: (
                testUuid: string
            ) => Promise<ISimpleHistoryResult>
            onError: (callback: (error: Error) => any) => Promise<any>
        }
    }
}

@NgModule({
    declarations: [
        AppComponent,
        HomeScreenComponent,
        TestScreenComponent,
        ResultScreenComponent,
        HeaderComponent,
        FooterComponent,
        StartTestButtonComponent,
        GaugeComponent,
        InterimResultsComponent,
        DlComponent,
        SpacerComponent,
        TestHeaderComponent,
        TestIndicatorComponent,
        TestBoxesComponent,
        TestChartComponent,
        TestChartsComponent,
        HomeMetricsComponent,
    ],
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        AppRoutingModule,
        MatIconModule,
        MatButtonModule,
        MatTooltipModule,
        MatSnackBarModule,
        HttpClientModule,
        TranslocoRootModule,
    ],
    providers: [],
    bootstrap: [AppComponent],
})
export class AppModule {}
