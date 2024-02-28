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
import { ClientSelectComponent } from "src/app/widgets/client-select/client-select.component"
import { TestServersComponent } from "src/app/widgets/test-servers/test-servers.component"
import { CMSService } from "src/app/services/cms.service"
import { IEnv } from "../../../../../electron/interfaces/env.interface"
import { SettingsLocalDataComponent } from "src/app/widgets/settings-local-data/settings-local-data.component"
import { Router } from "@angular/router"
import { ERoutes } from "src/app/enums/routes.enum"

export interface ISettingsRow {
    title: string
    component: Type<any>
    parameters?: IDynamicComponentParameters
}

@Component({
    selector: "app-settings-screen",
    templateUrl: "./settings-screen.component.html",
    styleUrls: ["./settings-screen.component.scss"],
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
        this.cms.getProject({ dropCache: true }),
    ]).pipe(
        map(([t, settings, project]) => {
            const env = this.env$.value
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
                    title: t["Open source"],
                    component: SettingsRepoLinkComponent,
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
            if (env?.FLAVOR === "ont") {
                content.push({
                    title: t["Region"],
                    component: ClientSelectComponent,
                    parameters: {
                        className: "app-client-select--settings",
                        reloadPage: true,
                    },
                })
            }
            if (env?.FLAVOR === "ont" && project?.can_choose_server) {
                content.push({
                    title: t["Server"],
                    component: TestServersComponent,
                    parameters: {
                        hideTitle: true,
                    },
                })
            }
            content.push({
                title: t["Local data"],
                component: SettingsLocalDataComponent,
            })
            if (env?.FLAVOR === "ont") {
                this.tableClassNames.push("app-table--ont")
            }
            return {
                content,
                totalElements: content.length,
            }
        })
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
        private cms: CMSService,
        private cdr: ChangeDetectorRef
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
