import { Store } from "../../measurement/services/store.service"
import { I18nService, t } from "../../measurement/services/i18n.service"
import { Events } from "../enums/events.enum"
import { ERoutes } from "../../ui/src/app/enums/routes.enum"

const { app, Menu } = require("electron")

const isMac = process.platform === "darwin"

const template = [
    // { role: 'appMenu' }
    ...(isMac
        ? [
              {
                  label: app?.name,
                  submenu: [
                      { role: "hide", label: t("Hide") },
                      { role: "hideOthers", label: t("Hide others") },
                      { role: "unhide", label: t("Unhide") },
                      { type: "separator" },
                      { role: "quit", label: t("Quit") },
                  ],
              },
          ]
        : []),
    // { role: 'fileMenu' }
    {
        label: t("File"),
        submenu: [
            {
                label: t("Settings"),
                click: async (
                    e: Electron.KeyboardEvent,
                    $: Electron.BrowserWindow
                ) => {
                    $.webContents.send(Events.OPEN_SCREEN, ERoutes.SETTINGS)
                },
            },
            {
                role: isMac ? "close" : "quit",
                label: isMac ? t("Close") : t("Quit"),
            },
            {
                label: t("Delete local data"),
                click: async () => {
                    await Store.wipeDataAndQuit()
                },
            },
        ],
    },
    // { role: 'editMenu' }
    {
        label: t("Edit"),
        submenu: [
            { role: "undo", label: t("Undo") },
            { role: "redo", label: t("Redo") },
            { type: "separator" },
            { role: "cut", label: t("Cut") },
            { role: "copy", label: t("Copy") },
            { role: "paste", label: t("Paste") },
            ...(isMac
                ? [
                      {
                          role: "pasteAndMatchStyle",
                          label: t("Paste and match style"),
                      },
                      { role: "delete", label: t("Delete") },
                      { role: "selectAll", label: t("Select all") },
                      { type: "separator" },
                      //   {
                      //       label: "Speech",
                      //       submenu: [
                      //           { role: "startSpeaking" },
                      //           { role: "stopSpeaking" },
                      //       ],
                      //   },
                  ]
                : [
                      { role: "delete", label: t("Delete") },
                      { type: "separator" },
                      { role: "selectAll", label: t("Select all") },
                  ]),
        ],
    },
    // { role: 'windowMenu' }
    {
        label: t("Window"),
        submenu: [{ role: "minimize", label: t("Minimize") }],
    },
    {
        role: "help",
        label: t("Help"),
        submenu: [
            {
                label: t("Help"),
                click: async () => {
                    const { shell } = require("electron")
                    await shell.openExternal(
                        `https://www.rtr.at/${I18nService.I.getActiveLanguage()}/tk/netztesthilfe`
                    )
                },
            },
        ],
    },
]

export const buildMenu = () => Menu.buildFromTemplate(template as any)
