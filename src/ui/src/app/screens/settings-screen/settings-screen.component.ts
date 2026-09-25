import {
    AfterViewChecked,
    ChangeDetectorRef,
    Component,
    OnInit,
    Type,
} from "@angular/core"
import { IBasicResponse } from "src/app/interfaces/basic-response.interface"
import { IDynamicComponentParameters } from "src/app/interfaces/dynamic-component.interface"
import { ISort } from "src/app/interfaces/sort.interface"
import { ITableColumn } from "src/app/interfaces/table-column.interface"
import { MainStore } from "src/app/store/main.store"
import { SettingsIpComponent } from "src/app/widgets/settings-ip/settings-ip.component"
import { SettingsRepoLinkComponent } from "src/app/widgets/settings-repo-link/settings-repo-link.component"
import { SettingsUuidComponent } from "src/app/widgets/settings-uuid/settings-uuid.component"
import { SettingsVersionComponent } from "src/app/widgets/settings-version/settings-version.component"
import { EIPVersion } from "../../../../../measurement/enums/ip-version.enum"
import { SettingsLocaleComponent } from "src/app/widgets/settings-locale/settings-locale.component"
import { Observable, combineLatest, map } from "rxjs"
import { TranslocoService } from "@ngneat/transloco"
import { BaseScreen } from "../base-screen/base-screen.component"
import { MessageService } from "src/app/services/message.service"
import { SettingsLocalDataComponent } from "src/app/widgets/settings-local-data/settings-local-data.component"
import { Router } from "@angular/router"
import { SettingsCommitComponent } from "src/app/widgets/settings-commit/settings-commit.component"
import { SettingsEngineComponent } from "src/app/widgets/settings-engine/settings-engine.component"
import { SettingsServerComponent } from "src/app/widgets/settings-server/settings-server.component"
import { SettingsLogComponent } from "src/app/widgets/settings-log/settings-log.component"

export interface ISettingsRow {
    title: string
    component: Type<any>
    parameters?: IDynamicComponentParameters
}

@Component({
    selector: "app-settings-screen",
    templateUrl: "./settings-screen.component.html",
    styleUrls: ["./settings-screen.component.scss"],
    standalone: false
})
export class SettingsScreenComponent
    extends BaseScreen
    implements OnInit, AfterViewChecked
{
    columns: ITableColumn[] = [
        {
            columnDef: "title",
            header: "",
        },
        {
            columnDef: "component",
            header: "",
            isComponent: true,
        },
    ]
    env$ = this.mainStore.env$
    data$: Observable<IBasicResponse<ISettingsRow>> = combineLatest([
        this.transloco.selectTranslation(),
        this.mainStore.settings$,
        this.mainStore.env$,
    ]).pipe(
        map(([t, settings, env]) => {
            const content: ISettingsRow[] = [
                {
                    title: t["Client UUID"],
                    component: SettingsUuidComponent,
                },
                {
                    title: t["Version"],
                    component: SettingsVersionComponent,
                },
                {
                    title: t["Commit hash"],
                    component: SettingsCommitComponent,
                },
                {
                    title: t["Open source"],
                    component: SettingsRepoLinkComponent,
                },
                {
                    title: t["Measurement engine"],
                    component: SettingsEngineComponent,
                },
            ]
            if (settings?.ipInfo?.publicV4) {
                content.push({
                    title: t["IPv4 only"],
                    component: SettingsIpComponent,
                    parameters: {
                        ipVersion: EIPVersion.v4,
                    },
                })
            }
            if (settings?.ipInfo?.publicV6) {
                content.push({
                    title: t["IPv6 only"],
                    component: SettingsIpComponent,
                    parameters: {
                        ipVersion: EIPVersion.v6,
                    },
                })
            }
            if (env?.ENABLE_LANGUAGE_SWITCH === "true") {
                content.push({
                    title: t["Language"],
                    component: SettingsLocaleComponent,
                })
            }
            // Advanced: pick a specific test server (ports the website's "Test
            // server" option). Hidden unless --debug is set or a non-default
            // server is currently selected. Evaluated from live env (data$ now
            // reacts to env$), so choosing "Default server" clears
            // PREFERRED_SERVER and the row disappears.
            if (env?.DEBUG || !!env?.PREFERRED_SERVER) {
                content.push({
                    title: t["Test server"] || "Test server",
                    component: SettingsServerComponent,
                })
            }
            // Shown only when file logging is enabled: the folder logs are
            // written to (LOG_PATH is empty otherwise; computed in get-env.ts).
            if (env?.LOG_PATH) {
                content.push({
                    title: t["Log file"] || "Log file",
                    component: SettingsLogComponent,
                })
            }
            content.push({
                title: t["Local data"],
                component: SettingsLocalDataComponent,
            })
            return {
                content,
                totalElements: content.length,
            }
        }),
    )
    sort: ISort = {
        active: "",
        direction: "",
    }
    tableClassNames = ["app-table--wide"]

    constructor(
        mainStore: MainStore,
        message: MessageService,
        private router: Router,
        private transloco: TranslocoService,
        private cdr: ChangeDetectorRef,
    ) {
        super(mainStore, message)
    }

    ngAfterViewChecked(): void {
        this.cdr.detectChanges()
    }

    ngOnInit(): void {
        if (!this.mainStore.settings$.value) {
            this.mainStore.registerClient()
        }
    }
}
