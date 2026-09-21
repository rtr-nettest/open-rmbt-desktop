const path = require("path")
const { codeSignApp } = require("../../../scripts/codesign-app.js")
const packJson = require("../../../package.json")
const yargs = require("yargs")
const argv = yargs.option("nosign").argv

// Apple notarization needs an app-specific password. It is intentionally NOT
// kept in prod.env / the .env file (that file is fetched from a repo and read
// by the running client; a live Apple credential should not live there). Supply
// it through the process ENVIRONMENT only, at the moment you build a signed
// macOS build:
//
//   export APPLE_PASSWORD='xxxx-xxxx-xxxx-xxxx'   # app-specific password from
//                                                 # https://appleid.apple.com
//   npm run make:macos
//
// In CI it would be a GitHub Actions secret (secrets.APPLE_PASSWORD) exported as
// an env var for the signing step — but note the CI workflow does NOT sign or
// notarize (it never sets MACOS=true), so it does not need this at all. This
// throws a clear error only when a signed build is actually requested without it.
function requireApplePassword() {
    const pw = process.env.APPLE_PASSWORD
    if (!pw) {
        throw new Error(
            "APPLE_PASSWORD is not set. Notarization needs an Apple " +
                "app-specific password provided via the environment, e.g. " +
                "`export APPLE_PASSWORD=xxxx-xxxx-xxxx-xxxx` before " +
                "`npm run make:macos`. It is deliberately not stored in " +
                "prod.env/.env. Use `--nosign` to build without signing.",
        )
    }
    return pw
}

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
                        "RMBTDesktop_Distribution_Profile.provisionprofile"
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
                      // From the environment, never prod.env — see requireApplePassword above.
                      appleIdPassword: requireApplePassword(),
                      teamId: process.env.APPLE_TEAM_ID,
                  },
              }),
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
                              icon: path.join(
                                  process.env.ASSETS_FOLDER,
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
