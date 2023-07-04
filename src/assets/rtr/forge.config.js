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
                authors: "Rundfunk und Telekom Regulierungs-GmbH (RTR-GmbH)",
                description: "RTR Desktop app",
                // https://www.files.certum.eu/documents/manual_en/Code-Signing-signing-the-code-using-tools-like-Singtool-and-Jarsigner_v2.3.pdf
                signWithParams: "/fd sha256 /a /t http://time.certum.pl/",
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
