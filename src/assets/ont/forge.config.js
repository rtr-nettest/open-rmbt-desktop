const path = require("path")

module.exports = {
    packagerConfig: {
        icon: path.join(process.env.ASSETS_FOLDER, "app-icon", "icon"),
        ignore: [
            "src/",
            "log/",
            "node_modules",
            ".prettierrc",
            ".config.js",
            ".example",
        ],
    },
    rebuildConfig: {},
    makers: [
        {
            name: "@electron-forge/maker-squirrel",
            config: {
                name: "open-rmbt-desktop",
                authors: "Specure GmbH",
                description: "Open Nettest Desktop app",
                loadingGif: path.join(
                    process.env.ASSETS_FOLDER,
                    "images",
                    "splash.gif"
                ),
            },
        },
        {
            name: "@electron-forge/maker-dmg",
            config: {
                format: "ULFO",
            },
        },
        {
            name: "@electron-forge/maker-deb",
            config: {},
        },
        {
            name: "@electron-forge/maker-rpm",
            config: {},
        },
    ],
}
