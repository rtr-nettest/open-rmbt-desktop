import fs from "fs"
import path from "path"
import extract from "extract-zip"

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

    const buffer = await response.arrayBuffer()
    const tempDir = path.join(__dirname, "temp")
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true })
    }
    const zipPath = path.join(tempDir, "RTR-NetztestCLI-win32.zip")
    fs.writeFileSync(zipPath, Buffer.from(buffer))
    await extract(zipPath, {
        dir: tempDir,
    })
    const destDir = path.join(
        __dirname,
        "..",
        "src",
        "measurement",
        "java_client",
    )
    if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true })
    }
    fs.copyFileSync(
        path.join(tempDir, "app", "RMBTClient-all.jar"),
        path.join(
            __dirname,
            "..",
            "src",
            "measurement",
            "java_client",
            "RMBTClient-all.jar",
        ),
    )
    fs.rmSync(tempDir, { recursive: true, force: true })
    console.log("Java engine downloaded and extracted successfully.")
}

downloadJavaEngine()
