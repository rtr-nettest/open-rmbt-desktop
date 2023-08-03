const path = require("path")
const { codeSignApp } = require("../../../scripts/codesign-app.js")
const packJson = require("../../../package.json")
const patchMakerAppX = require("../../../scripts/patch-maker-appx.js")
patchMakerAppX()

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
                manifest: path.resolve(
                    __dirname,
                    process.env.WINDOWS_PUBLISHER_IDENTITY ===
                        "CN=developmentca"
                        ? "AppXManifest.dev.xml"
                        : "AppXManifest.xml"
                ),
                packageDescription: "RTR Desktop App",
                packageDisplayName: "RMBT Desktop",
                authors: "Rundfunk und Telekom Regulierungs-GmbH (RTR-GmbH)",
                description: "RTR Desktop app",
                packageName: "RundfunkundTelekomRegulie.RTR-Netztest",
                publisher:
                    process.env.WINDOWS_PUBLISHER_IDENTITY ||
                    "CN=Rundfunk und Telekom Regulierungs-GmbH (RTR-GmbH), O=Rundfunk und Telekom Regulierungs-GmbH (RTR-GmbH), L=Wien, C=AT, SERIALNUMBER=208312t, OID.2.5.4.15=Private Organization, STREET=Mariahilfer Straße 77-79, PostalCode=1060, OID.1.3.6.1.4.1.311.60.2.1.1=Wien, OID.1.3.6.1.4.1.311.60.2.1.3=AT",
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
            name: "@electron-forge/maker-dmg",
            config: {
                format: "ULFO",
            },
        },
        {
            name: "@electron-forge/maker-deb",
            config: {
                options: {
                    bin: packJson.productName,
                    icon: path.resolve(__dirname, "app-icon", "icon.png"),
                    maintainer: "RTR-GmbH",
                    homepage: packJson.repository,
                    productName: "RMBT Desktop",
                },
            },
        },
        {
            name: "@electron-forge/maker-rpm",
            config: {
                options: {
                    bin: packJson.productName,
                    icon: path.resolve(__dirname, "app-icon", "icon.png"),
                    maintainer: "RTR-GmbH",
                    homepage: packJson.repository,
                    productName: "RMBT Desktop",
                },
            },
        },
    ],
}
