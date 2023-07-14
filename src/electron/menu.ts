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
    {
        label: "Edit",
        submenu: [
            { role: "undo" },
            { role: "redo" },
            { type: "separator" },
            { role: "cut" },
            { role: "copy" },
            { role: "paste" },
            ...(isMac
                ? [
                      { role: "pasteAndMatchStyle" },
                      { role: "delete" },
                      { role: "selectAll" },
                      { type: "separator" },
                      {
                          label: "Speech",
                          submenu: [
                              { role: "startSpeaking" },
                              { role: "stopSpeaking" },
                          ],
                      },
                  ]
                : [
                      { role: "delete" },
                      { type: "separator" },
                      { role: "selectAll" },
                  ]),
        ],
    },
    // { role: 'viewMenu' }
    {
        label: "View",
        submenu: [
            { role: "reload" },
            { role: "forceReload" },
            { role: "toggleDevTools" },
            { type: "separator" },
            { role: "resetZoom" },
            { role: "zoomIn" },
            { role: "zoomOut" },
            { type: "separator" },
            { role: "togglefullscreen" },
        ],
    },
    // { role: 'windowMenu' }
    {
        label: "Window",
        submenu: [
            { role: "minimize" },
            { role: "zoom" },
            ...(isMac
                ? [
                      { type: "separator" },
                      { role: "front" },
                      { type: "separator" },
                      { role: "window" },
                  ]
                : [{ role: "close" }]),
        ],
    },
    {
        role: "help",
        submenu: [
            {
                label: "Learn More",
                click: async () => {
                    const { shell } = require("electron")
                    await shell.openExternal("https://electronjs.org")
                },
            },
        ],
    },
]

export const menu = Menu.buildFromTemplate(template as any)
