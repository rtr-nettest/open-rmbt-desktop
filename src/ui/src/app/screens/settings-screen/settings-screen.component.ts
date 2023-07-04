import { Component, OnInit, Type } from "@angular/core"
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
export class SettingsScreenComponent extends BaseScreen implements OnInit {
    columns: ITableColumn[] = [
        {
            columnDef: "title",
            header: "",
        },
        {
            columnDef: "component",
            header: "",
        },
    ]
    data$: Observable<IBasicResponse<ISettingsRow>> = combineLatest([
        this.mainStore.env$,
        this.transloco.selectTranslation(),
    ]).pipe(
        map(([env, t]) => {
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
                {
                    title: t["IPv4 only"],
                    component: SettingsIpComponent,
                    parameters: {
                        ipVersion: EIPVersion.v4,
                    },
                },
                {
                    title: t["IPv6 only"],
                    component: SettingsIpComponent,
                    parameters: {
                        ipVersion: EIPVersion.v6,
                    },
                },
            ]
            if (env?.ENABLE_LANGUAGE_SWITCH === "true") {
                content.push({
                    title: t["Language"],
                    component: SettingsLocaleComponent,
                })
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
        private transloco: TranslocoService
    ) {
        super(mainStore, message)
    }

    ngOnInit(): void {
        if (!this.mainStore.settings$.value) {
            this.mainStore.registerClient()
        }
    }
}
