const path = require("path")
const { codeSignApp } = require("../../../scripts/codesign-app.js")
const packJson = require("../../../package.json")

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
                ...(process.env.WINDOWS_CERT_PATH
                    ? { devCert: process.env.WINDOWS_CERT_PATH }
                    : {}),
                manifest: path.resolve(__dirname, "AppXManifest.xml"),
                packageDescription: "RTR Desktop App",
                packageDisplayName: "RMBT Desktop",
                authors: "Rundfunk und Telekom Regulierungs-GmbH (RTR-GmbH)",
                description: "RTR Desktop app",
                signtoolParams: process.env.WINDOWS_CERT_PATH
                    ? undefined
                    : ["/fd sha256", "/a", "/t http://time.certum.pl/"],
                packageName: "RMBTDesktop",
                publisher:
                    process.env.WINDOWS_PUBLISHER_IDENTITY ||
                    "CN=Rundfunk und Telekom Regulierungs-GmbH (RTR-GmbH)",
                windowsKit: process.env.WINDOWS_KITS_PATH,
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
            config: {
                maintainer: "RTR-GmbH",
                homepage: packJson.repository,
            },
        },
        {
            name: "@electron-forge/maker-rpm",
            config: {},
        },
    ],
}
