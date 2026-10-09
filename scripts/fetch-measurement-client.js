/*
 * Fetch the native measurement client(s) for LOCAL development.
 *
 * The binaries under src/measurement/<engine>_client/ are NOT committed and NOT
 * built here; CI downloads them per MEASUREMENT_ENGINE_VERSION. For local dev
 * they have to be provided too — running an outdated/stub build silently breaks
 * features (e.g. a stub that doesn't implement loop mode returns no loopUuid).
 *
 * This script downloads a client for the current platform from the
 * open-rmbt-client-cli GitHub releases and installs it into
 * src/measurement/<engine>_client/. build:all then copies it into dist/.
 *
 * Two engine shapes are supported:
 *   - rust / c : a single native binary (rmbt-client[.exe]) is picked out of the
 *                zip and written into the engine dir.
 *   - java     : a whole jpackage app-image (its own JRE, a launcher .exe/binary
 *                plus runtime/ and app/) is extracted verbatim into the dir.
 *
 * Usage:
 *   npm run fetch:client                     # rust (default)
 *   npm run fetch:java                       # java (bundled JRE)
 *   npm run fetch:engines                    # rust + java
 *   node scripts/fetch-measurement-client.js rust java c
 *   MEASUREMENT_ENGINE_VERSION=v2.5.4 npm run fetch:client   # override version
 */
const fs = require("fs")
const path = require("path")
const os = require("os")
const AdmZip = require("adm-zip")

// Keep this default in sync with MEASUREMENT_ENGINE_VERSION in
// .github/workflows/build-open-rmbt-desktop.yml so local == CI.
const DEFAULT_VERSION = "v2.5.3"
const VERSION = process.env.MEASUREMENT_ENGINE_VERSION || DEFAULT_VERSION
const BASE_URL =
    "https://github.com/rtr-nettest/open-rmbt-client-cli/releases/download"

// Per-platform asset suffix (what the release zips are named after the engine).
// macOS publishes only an arm64 build; the C client has no Windows build.
function platformKey(engine) {
    const platform = os.platform()
    const arch = os.arch()
    if (platform === "win32") {
        if (engine === "c") {
            throw new Error("The C measurement client has no Windows build.")
        }
        return arch === "arm64" ? "windows-arm64" : "windows-x64"
    }
    if (platform === "darwin") {
        return "macos-arm64" // only an arm64 macOS build is published
    }
    if (platform === "linux") {
        return "linux-x64"
    }
    throw new Error(`Unsupported platform: ${platform}/${arch}`)
}

// Engine registry. `dir` is the subfolder under src/measurement/ (matches the
// *_client dirs the client services resolve), `kind` selects how the zip is
// unpacked.
const ENGINES = {
    rust: { dir: "rust_client", asset: "rust", kind: "binary" },
    c: { dir: "c_client", asset: "c", kind: "binary" },
    java: { dir: "java_client", asset: "java", kind: "appimage" },
}

async function download(url) {
    const res = await fetch(url) // Node >=18 global fetch; follows redirects.
    if (!res.ok) {
        throw new Error(
            `Download failed: HTTP ${res.status} ${res.statusText}\n` +
                `  ${url}\n` +
                `Check that the version "${VERSION}" and that asset exist in the release.`
        )
    }
    return Buffer.from(await res.arrayBuffer())
}

// rust / c: extract the single native binary into the engine dir.
function installBinary(zip, destDir) {
    const binEntry = zip
        .getEntries()
        .find(
            (e) =>
                !e.isDirectory &&
                /(^|\/)rmbt-client(\.exe)?$/.test(e.entryName)
        )
    if (!binEntry) {
        throw new Error(
            `rmbt-client binary not found inside the zip. ` +
                `Entries: ${zip
                    .getEntries()
                    .map((e) => e.entryName)
                    .join(", ")}`
        )
    }
    const outName =
        os.platform() === "win32" ? "rmbt-client.exe" : "rmbt-client"
    const outPath = path.join(destDir, outName)
    fs.mkdirSync(destDir, { recursive: true })
    fs.writeFileSync(outPath, binEntry.getData())
    if (os.platform() !== "win32") {
        fs.chmodSync(outPath, 0o755)
    }
    return outName
}

// java: extract the whole jpackage app-image verbatim into the engine dir.
function installAppImage(zip, destDir) {
    fs.mkdirSync(destDir, { recursive: true })
    zip.extractAllTo(destDir, /* overwrite */ true)
    if (os.platform() !== "win32") {
        // extractAllTo doesn't preserve the executable bit; restore it on the
        // launcher candidates (Linux bin/, macOS .app bundle).
        for (const rel of [
            "bin/rmbt-client",
            "rmbt-client/bin/rmbt-client",
            "rmbt-client.app/Contents/MacOS/rmbt-client",
            "rmbt-client/rmbt-client.app/Contents/MacOS/rmbt-client",
        ]) {
            const p = path.join(destDir, rel)
            if (fs.existsSync(p)) {
                fs.chmodSync(p, 0o755)
            }
        }
    }
    return os.platform() === "win32" ? "rmbt-client.exe (app-image)" : "app-image"
}

async function fetchEngine(name) {
    const engine = ENGINES[name]
    if (!engine) {
        throw new Error(
            `Unknown engine "${name}". Known: ${Object.keys(ENGINES).join(", ")}`
        )
    }
    const asset = `rmbt-client-${engine.asset}-${platformKey(name)}.zip`
    const url = `${BASE_URL}/${VERSION}/${asset}`
    const destDir = path.join(
        __dirname,
        "..",
        "src",
        "measurement",
        engine.dir
    )

    console.log(`Fetching ${name} measurement client ${VERSION} …`)
    console.log(`  ${url}`)

    const buf = await download(url)
    const zip = new AdmZip(buf)
    const what =
        engine.kind === "appimage"
            ? installAppImage(zip, destDir)
            : installBinary(zip, destDir)
    console.log(`Installed ${name} client ${what} (${VERSION}) -> ${destDir}`)
}

async function main() {
    // Engines from argv (e.g. "rust java"), defaulting to rust.
    const requested = process.argv.slice(2).filter(Boolean)
    const engines = requested.length ? requested : ["rust"]
    for (const name of engines) {
        await fetchEngine(name)
    }
}

main().catch((err) => {
    console.error(`\nfetch-measurement-client failed:\n${err.message}`)
    process.exit(1)
})
