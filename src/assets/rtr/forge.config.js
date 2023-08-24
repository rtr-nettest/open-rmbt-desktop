const path = require("path")
const { codeSignApp } = require("../../../scripts/codesign-app.js")
const packJson = require("../../../package.json")
// const patchMakerAppX = require("../../../scripts/patch-maker-appx.js")
// patchMakerAppX()

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
            name: "@electron-forge/maker-squirrel",
            config: {
                authors: "Rundfunk und Telekom Regulierungs-GmbH (RTR-GmbH)",
                ...(process.env.WINDOWS_CERT_PATH
                    ? {
                          certificateFile: process.env.WINDOWS_CERT_PATH,
                      }
                    : {
                          // https://www.files.certum.eu/documents/manual_en/Code-Signing-signing-the-code-using-tools-like-Singtool-and-Jarsigner_v2.3.pdf
                          signWithParams:
                              "/fd sha256 /a /t http://time.certum.pl/",
                      }),
                loadingGif: path.join(
                    process.env.ASSETS_FOLDER,
                    "images",
                    "splash.gif"
                ),
                setupIcon: path.resolve(__dirname, "app-icon", "icon.ico"),
                iconUrl: "https://www.netztest.at/favicon.ico",
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
