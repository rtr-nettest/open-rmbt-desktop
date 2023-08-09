const path = require("path")
const { codeSignApp } = require("../../../scripts/codesign-app.js")
const packJson = require("../../../package.json")
const patchMakerAppX = require("../../../scripts/patch-maker-appx.js")
patchMakerAppX()

module.exports = {
    hooks: {
        postPackage: async () => {
            if (
                process.platform === "darwin" &&
                process.env.APP_STORE === "true"
            ) {
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
        ...(process.env.APP_STORE !== "true"
            ? {
                  osxSign: {},
                  osxNotarize: {
                      tool: "notarytool",
                      appleId: process.env.APPLE_ID,
                      appleIdPassword: process.env.APPLE_PASSWORD,
                      teamId: process.env.APPLE_TEAM_ID,
                  },
              }
            : {}),
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
                    "CN=0F2FE87F-3FC2-475F-B440-0E556517BC3C",
                windowsKit: process.env.WINDOWS_KITS_PATH,
            },
        },
        ...[
            process.env.APP_STORE === "true"
                ? {
                      name: "@electron-forge/maker-pkg",
                      config: {
                          identity: process.env.APPLE_INSTALLER_IDENTITY,
                      },
                  }
                : {
                      name: "@electron-forge/maker-dmg",
                      config: {
                          format: "ULFO",
                          icon: path.resolve(
                              __dirname,
                              "app-icon",
                              "icon.icns"
                          ),
                      },
                  },
        ],
        ...(process.env.DEB === "true"
            ? [
                  {
                      name: "@electron-forge/maker-deb",
                      config: {
                          options: {
                              bin: packJson.productName,
                              icon: path.resolve(
                                  __dirname,
                                  "app-icon",
                                  "icon.png"
                              ),
                              maintainer: "RTR-GmbH",
                              homepage: packJson.repository,
                              productName: "RMBT Desktop",
                          },
                      },
                  },
              ]
            : []),
        ...(process.env.RPM === "true"
            ? [
                  {
                      name: "@electron-forge/maker-rpm",
                      config: {
                          options: {
                              bin: packJson.productName,
                              icon: path.resolve(
                                  __dirname,
                                  "app-icon",
                                  "icon.png"
                              ),
                              maintainer: "RTR-GmbH",
                              homepage: packJson.repository,
                              productName: "RMBT Desktop",
                          },
                      },
                  },
              ]
            : []),
    ],
}
