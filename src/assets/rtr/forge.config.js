const path = require("path")
const { codeSignApp } = require("../../../scripts/codesign-app.js")

module.exports = {
    hooks: {
        postPackage: async () => {
            if (process.platform === "darwin") {
                await codeSignApp(
                    path.resolve(__dirname, "entitlements.plist"),
                    path.resolve(
                        __dirname,
                        "RMBTDesktop_Distribution_Profile.provisionprofile"
                    )
                )
            }
        },
    },
    packagerConfig: {
        icon: path.resolve(__dirname, "app-icon", "icon"),
        ignore: [
            "coverage/",
            "src/",
            "log/",
            "node_modules/",
            ".prettierrc",
            ".config.js",
            ".example",
        ],
        appBundleId: process.env.APP_BUNDLE_ID,
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
            name: "@electron-forge/maker-pkg",
            config: {
                identity: process.env.APPLE_INSTALLER_IDENTITY,
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
