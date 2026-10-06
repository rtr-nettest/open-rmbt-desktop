/*
 * Fetch the native Rust measurement client for LOCAL development.
 *
 * The binary under src/measurement/rust_client/ is NOT committed and NOT built
 * here; CI downloads it per MEASUREMENT_ENGINE_VERSION. For local dev the binary
 * has to be provided too — running an outdated/stub build silently breaks
 * features (e.g. a stub that doesn't implement loop mode returns no loopUuid).
 *
 * This script downloads the Rust client for the current platform from the
 * open-rmbt-client-cli GitHub releases and installs it into
 * src/measurement/rust_client/. build:all then copies it into dist/.
 *
 * Usage:
 *   npm run fetch:client
 *   MEASUREMENT_ENGINE_VERSION=v2.5.3 npm run fetch:client   # override version
 */
const fs = require("fs")
const path = require("path")
const os = require("os")
const AdmZip = require("adm-zip")

// Keep this default in sync with MEASUREMENT_ENGINE_VERSION in
// .github/workflows/build-open-rmbt-desktop.yml so local == CI.
const DEFAULT_VERSION = "v2.5.2"
const VERSION = process.env.MEASUREMENT_ENGINE_VERSION || DEFAULT_VERSION
const BASE_URL =
    "https://github.com/rtr-nettest/open-rmbt-client-cli/releases/download"

function assetForPlatform() {
    const platform = os.platform()
    const arch = os.arch()
    if (platform === "win32") {
        return arch === "arm64"
            ? "rmbt-client-rust-windows-arm64.zip"
            : "rmbt-client-rust-windows-x64.zip"
    }
    if (platform === "darwin") {
        // Only an arm64 macOS build is published.
        return "rmbt-client-rust-macos-arm64.zip"
    }
    if (platform === "linux") {
        return "rmbt-client-rust-linux-x64.zip"
    }
    throw new Error(`Unsupported platform: ${platform}/${arch}`)
}

async function main() {
    const asset = assetForPlatform()
    const url = `${BASE_URL}/${VERSION}/${asset}`
    const destDir = path.join(
        __dirname,
        "..",
        "src",
        "measurement",
        "rust_client"
    )
    const outName = os.platform() === "win32" ? "rmbt-client.exe" : "rmbt-client"
    const outPath = path.join(destDir, outName)

    console.log(`Fetching Rust measurement client ${VERSION} …`)
    console.log(`  ${url}`)

    const res = await fetch(url) // Node >=18 global fetch; follows redirects.
    if (!res.ok) {
        throw new Error(
            `Download failed: HTTP ${res.status} ${res.statusText}\n` +
                `  ${url}\n` +
                `Check that the version "${VERSION}" and asset "${asset}" exist in the release.`
        )
    }

    const buf = Buffer.from(await res.arrayBuffer())
    const zip = new AdmZip(buf)
    const binEntry = zip
        .getEntries()
        .find((e) => !e.isDirectory && /(^|\/)rmbt-client(\.exe)?$/.test(e.entryName))
    if (!binEntry) {
        throw new Error(
            `rmbt-client binary not found inside ${asset}. ` +
                `Entries: ${zip
                    .getEntries()
                    .map((e) => e.entryName)
                    .join(", ")}`
        )
    }

    fs.mkdirSync(destDir, { recursive: true })
    fs.writeFileSync(outPath, binEntry.getData())
    if (os.platform() !== "win32") {
        fs.chmodSync(outPath, 0o755)
    }
    console.log(`Installed ${outName} (${VERSION}) -> ${outPath}`)
}

main().catch((err) => {
    console.error(`\nfetch-measurement-client failed:\n${err.message}`)
    process.exit(1)
})
