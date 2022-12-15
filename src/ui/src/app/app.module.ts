import { NgModule } from "@angular/core"
import { BrowserModule } from "@angular/platform-browser"

import { AppRoutingModule } from "./app-routing.module"
import { AppComponent } from "./app.component"
import { HomeScreenComponent } from "./screens/home-screen/home-screen.component"
import { TestScreenComponent } from "./screens/test-screen/test-screen.component"
import { ResultScreenComponent } from "./screens/result-screen/result-screen.component"
import { HeaderComponent } from "./widgets/header/header.component"
import { FooterComponent } from "./widgets/footer/footer.component"
import { StartTestButtonComponent } from "./widgets/start-test-button/start-test-button.component";
import { GaugeComponent } from './widgets/gauge/gauge.component';
import { InterimResultsComponent } from './widgets/interim-results/interim-results.component';
import { DlComponent } from './widgets/dl/dl.component';
import { SpacerComponent } from './widgets/spacer/spacer.component'

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
    ],
    imports: [BrowserModule, AppRoutingModule],
    providers: [],
    bootstrap: [AppComponent],
})
export class AppModule {}
