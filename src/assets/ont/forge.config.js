const path = require("path")
const { codeSignApp } = require("../../../scripts/codesign-app.js")
const packJson = require("../../../package.json")
const yargs = require("yargs")
const argv = yargs.option("nosign").argv

module.exports = {
    hooks: {
        postPackage: async (_, options) => {
            if (argv.nosign) {
                return
            }
            if (
                process.platform === "darwin" &&
                process.env.APP_STORE === "true"
            ) {
                await codeSignApp(
                    path.join(process.env.ASSETS_FOLDER, "entitlements.plist"),
                    path.join(
                        process.env.ASSETS_FOLDER,
                        "Open_Nettest_Desktop.provisionprofile"
                    )
                )
            }
        },
    },
    packagerConfig: {
        icon: path.join(process.env.ASSETS_FOLDER, "app-icon", "icon"),
        ignore: [
            "coverage$",
            "scripts$",
            "src$",
            "log$",
            "node_modules$",
            ".prettierrc",
            ".config.js",
            ".example",
            ".env",
            ".log$",
            ".gitignore",
            "README.md",
        ],
        appBundleId: process.env.APP_BUNDLE_ID,
        ...(process.env.MACOS !== "true" || argv.nosign
            ? {}
            : {
                  osxSign: {},
                  osxNotarize: {
                      tool: "notarytool",
                      appleId: process.env.APPLE_ID,
                      appleIdPassword: process.env.APPLE_PASSWORD,
                      teamId: process.env.APPLE_TEAM_ID,
                  },
              }),
    },
    rebuildConfig: {},
    makers: [
        {
            name: "@electron-forge/maker-squirrel",
            config: {
                authors: "Specure GmbH",
                name: "OpenNettest",
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
                setupIcon: path.join(
                    process.env.ASSETS_FOLDER,
                    "app-icon",
                    "icon.ico"
                ),
                iconUrl:
                    "https://portal-api.nettest.org/uploads/icon_1d00b6dc0c.ico",
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
                          icon: path.join(
                              process.env.ASSETS_FOLDER,
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
                              icon: path.join(
                                  process.env.ASSETS_FOLDER,
                                  "app-icon",
                                  "icon.png"
                              ),
                              maintainer: "Specure-GmbH",
                              homepage: packJson.repository,
                              productName: "Open Nettest",
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
                              icon: path.join(
                                  process.env.ASSETS_FOLDER,
                                  "app-icon",
                                  "icon.png"
                              ),
                              maintainer: "Specure-GmbH",
                              homepage: packJson.repository,
                              productName: "Open Nettest",
                          },
                      },
                  },
              ]
            : []),
    ],
}
