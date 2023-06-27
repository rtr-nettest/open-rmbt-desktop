import { Component, OnInit, Type } from "@angular/core"
import { IBasicResponse } from "src/app/interfaces/basic-response.interface"
import { ISort } from "src/app/interfaces/sort.interface"
import { ITableColumn } from "src/app/interfaces/table-column.interface"
import { MainStore } from "src/app/store/main.store"
import { SettingsRepoLinkComponent } from "src/app/widgets/settings-repo-link/settings-repo-link.component"
import { SettingsUuidComponent } from "src/app/widgets/settings-uuid/settings-uuid.component"
import { SettingsVersionComponent } from "src/app/widgets/settings-version/settings-version.component"

export interface ISettingsRow {
    title: string
    component: Type<any>
}

@Component({
    selector: "app-settings-screen",
    templateUrl: "./settings-screen.component.html",
    styleUrls: ["./settings-screen.component.scss"],
})
export class SettingsScreenComponent implements OnInit {
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
    data: IBasicResponse<ISettingsRow> = {
        content: [
            {
                title: "Client UUID",
                component: SettingsUuidComponent,
            },
            {
                title: "Version",
                component: SettingsVersionComponent,
            },
            {
                title: "Open source",
                component: SettingsRepoLinkComponent,
            },
        ],
        totalElements: 1,
    }
    sort: ISort = {
        active: "",
        direction: "",
    }
    tableClassNames = ["app-table--wide"]

    constructor(private store: MainStore) {}

    ngOnInit(): void {
        if (!this.store.settings$.value) {
            this.store.registerClient()
        }
    }
}
