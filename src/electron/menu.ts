import { I18nService } from "../measurement/services/i18n.service"
import { Events } from "./enums/events.enum"

const { app, Menu } = require("electron")

const isMac = process.platform === "darwin"

const template = [
    // { role: 'appMenu' }
    ...(isMac
        ? [
              {
                  label: app.name,
                  submenu: [
                      { role: "hide" },
                      { role: "hideOthers" },
                      { role: "unhide" },
                      { type: "separator" },
                      { role: "quit" },
                  ],
              },
          ]
        : []),
    // { role: 'fileMenu' }
    {
        label: "File",
        submenu: [
            {
                label: "Settings",
                click: async (
                    e: Electron.KeyboardEvent,
                    $: Electron.BrowserWindow
                ) => {
                    $.webContents.send(Events.OPEN_SETTINGS)
                },
            },
            { role: isMac ? "close" : "quit" },
        ],
    },
    // { role: 'editMenu' }
    // {
    //     label: "Edit",
    //     submenu: [
    //         { role: "undo" },
    //         { role: "redo" },
    //         { type: "separator" },
    //         { role: "cut" },
    //         { role: "copy" },
    //         { role: "paste" },
    //         ...(isMac
    //             ? [
    //                   { role: "pasteAndMatchStyle" },
    //                   { role: "delete" },
    //                   { role: "selectAll" },
    //                   { type: "separator" },
    //                   {
    //                       label: "Speech",
    //                       submenu: [
    //                           { role: "startSpeaking" },
    //                           { role: "stopSpeaking" },
    //                       ],
    //                   },
    //               ]
    //             : [
    //                   { role: "delete" },
    //                   { type: "separator" },
    //                   { role: "selectAll" },
    //               ]),
    //     ],
    // },
    // { role: 'windowMenu' }
    {
        label: "Window",
        submenu: [{ role: "minimize" }],
    },
    {
        role: "help",
        submenu: [
            {
                label: "Help",
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

export const menu = Menu.buildFromTemplate(template as any)
