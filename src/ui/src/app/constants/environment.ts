import { ERoutes } from "../enums/routes.enum"
import { IMainMenuItem } from "../interfaces/main-menu-item.interface"

export const environment: {
    menu: IMainMenuItem[]
} = {
    menu: [
        {
            label: "Run Test",
            icon: "test",
            route: ERoutes.TEST,
            translations: [],
        },
        {
            label: "My History",
            icon: "history",
            route: ERoutes.HISTORY,
            translations: [],
        },
    ],
}
