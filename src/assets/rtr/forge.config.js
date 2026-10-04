const path = require("path")
const fs = require("fs")
const os = require("os")
const { codeSignApp } = require("../../../scripts/codesign-app.js")
const packJson = require("../../../package.json")
const yargs = require("yargs")
const argv = yargs.option("nosign").option("arch").argv

// Target architecture for the MSIX manifest (electron-forge passes --arch).
const msixArch = argv.arch === "arm64" ? "arm64" : "x64"

// Render the AppxManifest for the Store build. @electron-forge/maker-appx does
// not expose PublisherDisplayName or the OS MinVersion, and the library defaults
// are rejected by the Store (PublisherDisplayName must match Partner Center and
// MinVersion must be > 10.0.17134.0). A provided manifest is used verbatim, so
// we substitute the values here from the MSIX_* env vars.
function renderMsixManifest(targetArch) {
    // Fail fast with a clear message if a tile asset referenced by the manifest
    // is missing. maker-appx skips its own asset check when a custom manifest is
    // supplied, so an absent file would otherwise surface only as a cryptic
    // "makeappx.exe Exit Code: 1" (empty stderr) during `make`.
    const assetDir = path.join(process.env.ASSETS_FOLDER, "app-icon")
    const requiredAssets = [
        "icon.png",
        "Square44x44Logo.png",
        "Square150x150Logo.png",
    ]
    const missingAssets = requiredAssets.filter(
        (f) => !fs.existsSync(path.join(assetDir, f))
    )
    if (missingAssets.length) {
        throw new Error(
            `MSIX tile assets missing in ${assetDir}: ${missingAssets.join(", ")}. ` +
                `They are referenced by AppxManifest.xml.in and must be present (committed).`
        )
    }
    // A blank Identity Name/Publisher produces the same opaque makeappx failure,
    // so require them explicitly (they come from prod.env in CI).
    for (const key of ["MSIX_PACKAGE_NAME", "MSIX_PUBLISHER"]) {
        if (!process.env[key]) {
            throw new Error(
                `${key} is not set — required for the MSIX (Microsoft Store) build. ` +
                    `Set it in .env (local) or prod.env (CI) from Partner Center > Product identity.`
            )
        }
    }
    const template = fs.readFileSync(
        path.join(process.env.ASSETS_FOLDER, "AppxManifest.xml.in"),
        "utf-8"
    )
    // MSIX requires a 4-part version; the Store reserves the revision (keep 0).
    const parts = String(packJson.version || "0.0.0").split("-")[0].split(".")
    while (parts.length < 4) parts.push("0")
    const version = parts.slice(0, 4).join(".")
    const minOS = process.env.MSIX_MIN_OS_VERSION || "10.0.17763.0"
    const displayName =
        process.env.MSIX_PACKAGE_DISPLAY_NAME || packJson.productName
    const subs = {
        IdentityName: process.env.MSIX_PACKAGE_NAME || "",
        Publisher: process.env.MSIX_PUBLISHER || "",
        PublisherDisplayName:
            process.env.MSIX_PUBLISHER_DISPLAY_NAME || packJson.author || "",
        DisplayName: displayName,
        AppDisplayName: displayName,
        Version: version,
        ProcessorArchitecture: targetArch,
        MinOSVersion: minOS,
        MaxOSVersionTested: process.env.MSIX_MAX_OS_VERSION_TESTED || minOS,
        PackageDescription: packJson.description || packJson.productName,
        PackageBackgroundColor: "#ffffff",
        AppExecutable: `${packJson.productName}.exe`,
    }
    let out = template
    for (const [key, value] of Object.entries(subs)) {
        out = out.split(`{{${key}}}`).join(value)
    }
    const file = path.join(os.tmpdir(), `AppxManifest-${targetArch}.xml`)
    fs.writeFileSync(file, out)
    return file
}

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
        // Windows Squirrel .exe installer — the default Windows build. It is
        // skipped for the Microsoft Store build (WIN_STORE=true) so the Store
        // (MSIX) maker runs on its own and the two don't collide.
        ...(process.env.WIN_STORE === "true"
            ? []
            : [
                  {
                      name: "@electron-forge/maker-squirrel",
                      config: {
                          authors:
                              "Rundfunk und Telekom Regulierungs-GmbH (RTR-GmbH)",
                          ...(process.env.WINDOWS_CERT_PATH
                              ? {
                                    certificateFile:
                                        process.env.WINDOWS_CERT_PATH,
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
              ]),
        // Microsoft Store package (MSIX/APPX) — only built when WIN_STORE=true,
        // so it never interferes with the regular Windows (Squirrel) build.
        // Identity (packageName / publisher) comes from Partner Center; the
        // signing cert is a local/self-signed .pfx (the Store re-signs on
        // ingestion, so no commercial certificate is needed for Store delivery).
        // See the "Microsoft Store (MSIX)" section of the README.
        ...(process.env.WIN_STORE === "true"
            ? [
                  {
                      name: "@electron-forge/maker-appx",
                      config: {
                          // Identity "Name" from Partner Center (Product identity).
                          packageName: process.env.MSIX_PACKAGE_NAME,
                          packageDisplayName:
                              process.env.MSIX_PACKAGE_DISPLAY_NAME ||
                              packJson.productName,
                          // Identity "Publisher", e.g. "CN=<GUID>" from Partner Center.
                          publisher: process.env.MSIX_PUBLISHER,
                          // Local signing cert (self-signed for dev/CI is fine;
                          // the Store re-signs). Dedicated MSIX_CERT_* keeps this
                          // independent of the Squirrel build's WINDOWS_CERT_PATH.
                          devCert:
                              process.env.MSIX_CERT_PATH ||
                              process.env.WINDOWS_CERT_PATH,
                          certPass:
                              process.env.MSIX_CERT_PASS ??
                              process.env.WINDOWS_CERT_PASS,
                          // Windows SDK bin dir holding makeappx.exe / signtool.exe.
                          windowsKit: process.env.WINDOWS_KITS_PATH,
                          // Tile images (Square*Logo.png / icon.png) live next
                          // to the app icons.
                          assets: path.join(
                              process.env.ASSETS_FOLDER,
                              "app-icon"
                          ),
                          // Rendered manifest with the correct PublisherDisplayName
                          // and MinVersion (maker-appx can't set those itself).
                          manifest: renderMsixManifest(msixArch),
                          packageBackgroundColor: "#ffffff",
                          // MSIX requires a 4-part version (x.y.z.0).
                          makeVersionWinStoreCompatible: true,
                      },
                  },
              ]
            : []),
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
        // Linux Flatpak — only built when FLATPAK=true, so it never interferes
        // with the deb/rpm builds. Needs flatpak, flatpak-builder and eu-strip
        // (elfutils) on the build host, plus the Freedesktop runtime/SDK and the
        // Electron base app from Flathub (see the CI workflow / README).
        ...(process.env.FLATPAK === "true"
            ? [
                  {
                      name: "@electron-forge/maker-flatpak",
                      config: {
                          options: {
                              // Reverse-DNS application id (derived from the macOS
                              // bundle id, dropping the platform suffix).
                              id: (
                                  process.env.APP_BUNDLE_ID || "at.netztest.app"
                              ).replace(/\.macos$/, ""),
                              productName: packJson.productName,
                              genericName: "Network measurement",
                              bin: packJson.productName,
                              icon: path.join(
                                  process.env.ASSETS_FOLDER,
                                  "app-icon",
                                  "icon.png"
                              ),
                              categories: ["Network", "Utility"],
                              description: packJson.description,
                              // Freedesktop runtime + Electron base app from Flathub.
                              base: "org.electronjs.Electron2.BaseApp",
                              baseVersion: "24.08",
                              runtime: "org.freedesktop.Platform",
                              runtimeVersion: "24.08",
                              sdk: "org.freedesktop.Sdk",
                              // Sandbox permissions an Electron network app needs.
                              finishArgs: [
                                  "--share=ipc",
                                  "--socket=x11",
                                  "--socket=wayland",
                                  "--socket=pulseaudio",
                                  "--share=network",
                                  "--device=dri",
                                  "--filesystem=home",
                                  "--talk-name=org.freedesktop.Notifications",
                              ],
                          },
                      },
                  },
              ]
            : []),
    ],
}
