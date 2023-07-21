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
            name: "@electron-forge/maker-appx",
            config: {
                assets: path.resolve(__dirname, "app-icon"),
                devCert:
                    "C:\\Users\\%USERNAME%\\AppData\\Roaming\\electron-windows-store\\developmentca\\developmentca.pfx",
                manifest: path.resolve(__dirname, "AppXManifest.xml"),
                packageDescription: "RTR Desktop App",
                packageDisplayName: "RMBT Desktop",
                packageName: "RMBTDesktop",
                publisher: "CN=developmentca",
                windowsKit:
                    "C:\\Program Files (x86)\\Windows Kits\\10\\bin\\10.0.19041.0\\x64",
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
