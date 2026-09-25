import fs from "fs"
import path from "path"
import AdmZip from "adm-zip"

// The only artifact we need out of the release archive.
const JAR_ENTRY = "app/RMBTClient-all.jar"

async function downloadJavaEngine() {
    console.log("Checking for Java engine...")
    const downloadUrl =
        "https://github.com/rtr-nettest/open-rmbt/releases/download/v0.9.3/RTR-NetztestCLI-win32.zip"

    const response = await fetch(downloadUrl)
    if (!response.ok) {
        throw new Error(
            `Failed to download Java engine: ${response.statusText}`,
        )
    }

    // Read the archive in memory and pull out just the one entry we need, rather
    // than extracting the whole zip to disk — no temp dir, and nothing outside
    // the destination is ever written.
    const zip = new AdmZip(Buffer.from(await response.arrayBuffer()))
    const entry = zip.getEntry(JAR_ENTRY)
    if (!entry) {
        throw new Error(`Entry "${JAR_ENTRY}" not found in the downloaded zip`)
    }

    const destDir = path.join(
        __dirname,
        "..",
        "src",
        "measurement",
        "java_client",
    )
    fs.mkdirSync(destDir, { recursive: true })

    // maintainEntryPath=false → writes <destDir>/RMBTClient-all.jar (drops the
    // "app/" prefix); overwrite=true.
    zip.extractEntryTo(entry, destDir, false, true)
    console.log("Java engine downloaded and extracted successfully.")
}

downloadJavaEngine()
