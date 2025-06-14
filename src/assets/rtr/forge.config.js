const path = require("path")
const { codeSignApp } = require("../../../scripts/codesign-app.js")
const packJson = require("../../../package.json")
const yargs = require("yargs")
const argv = yargs.option("nosign").argv
const fs = require('fs');

module.exports = {
    hooks: {
        postPackage: async (_, options, arch) => {
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
                        "RMBTDesktop_Distribution_Profile.provisionprofile"
                    ),
                    arch
                )
            }
        },
        // Move external CLI binary to appropriate places
        packageAfterCopy: async (config, buildPath, electronVersion, platform, arch) => {

            if (platform === "darwin") {
                var src = path.join(__dirname, '../../../binaries/RTR-NetztestCLI-darwin/RTR-Netztest.app');
                var dst = path.join(buildPath, '../../Frameworks/RTR-Netztest.app');;
                fs.cpSync(src, dst, {recursive: true, verbatimSymlinks: true});
            }
            else if (platform === "mas") {
                var src = path.join(__dirname, '../../../binaries/RTR-NetztestCLI-mas/RTR-Netztest.app');
                var dst = path.join(buildPath, '../../Frameworks/RTR-Netztest.app');;
                fs.cpSync(src, dst, {recursive: true, verbatimSymlinks: true});
            }
            else if (platform === "linux") {
                if (arch === "x64") {
                    var src = path.join(__dirname, '../../../binaries/RTR-NetztestCLI-linux-x64');
                    var dst = path.join(buildPath, '../../cli');;
                    fs.cpSync(src, dst, {recursive: true, verbatimSymlinks: true});
                }
                else if (arch === "arm64") {
                    var src = path.join(__dirname, '../../../binaries/RTR-NetztestCLI-linux-arm64');
                    var dst = path.join(buildPath, '../../cli');;
                    fs.cpSync(src, dst, {recursive: true, verbatimSymlinks: true});
                }
            }
            else if (platform === "win32") {
                var src = path.join(__dirname, '../../../binaries/RTR-NetztestCLI-win32');
                var dst = path.join(buildPath, '../../resources/cli');;
                fs.cpSync(src, dst, {recursive: true, verbatimSymlinks: true});
            }

        }
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
            "binaries",
            "RTR-Netztest.app",
            "RMBTClient-inin-java21.jar",
            "RTR-Netztest.cfg",
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
                authors: "RTR et al",
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
                              maintainer: "RTR et al",
                              homepage: packJson.repository,
                              productName: "Open RMBT Desktop",
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
                              maintainer: "RTR et al",
                              homepage: packJson.repository,
                              productName: "Open RMBT Desktop",
                          },
                      },
                  },
              ]
            : []),
    ],
}
