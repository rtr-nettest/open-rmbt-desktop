import { ERoutes } from "../enums/routes.enum"
import { IMainMenuItem } from "../interfaces/main-menu-item.interface"

export const environment: {
    menu: IMainMenuItem[]
} = {
    menu: [
        {
            label: "New Test",
            icon: "test",
            route: ERoutes.TEST,
            translations: [],
        },
        {
            label: "Loop Mode",
            icon: "loop",
            route: ERoutes.LOOP_MODE,
            translations: [],
            hidden: true,
        },
        {
            label: "Certified",
            icon: "certified",
            route: ERoutes.CERTIFIED,
            translations: [],
            hidden: true,
        },
        {
            label: "Map",
            icon: "map",
            route: ERoutes.MAP,
            translations: [],
            hidden: true,
        },
        {
            label: "History",
            icon: "history",
            route: ERoutes.HISTORY,
            translations: [],
        },
        {
            label: "Statistics",
            icon: "statistics",
            route: ERoutes.STATISTICS,
            translations: [],
            hidden: true,
        },
        {
            label: "Help",
            icon: "help",
            url: "https://www.rtr.at/$lang/tk/netztesthilfe",
            translations: [],
        },
    ],
}
