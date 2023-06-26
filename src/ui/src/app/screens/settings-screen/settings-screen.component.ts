import {
    Component,
    InjectionToken,
    Injector,
    Type,
    inject,
} from "@angular/core"
import { IBasicResponse } from "src/app/interfaces/basic-response.interface"
import { ISort } from "src/app/interfaces/sort.interface"
import { ITableColumn } from "src/app/interfaces/table-column.interface"
import { SettingsUuidComponent } from "src/app/widgets/settings-uuid/settings-uuid.component"

export interface ISettingsRow {
    title: string
    component: Type<any>
}

@Component({
    selector: "app-settings-screen",
    templateUrl: "./settings-screen.component.html",
    styleUrls: ["./settings-screen.component.scss"],
})
export class SettingsScreenComponent {
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
        ],
        totalElements: 1,
    }
    sort: ISort = {
        active: "",
        direction: "",
    }
}
