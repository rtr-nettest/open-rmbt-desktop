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
    const zipPath = path.join(__dirname, "temp", "RTR-NetztestCLI-win32.zip")
    fs.mkdirSync(path.join(__dirname, "temp"), { recursive: true })
    fs.writeFileSync(zipPath, Buffer.from(buffer))
    await extract(zipPath, {
        dir: path.join(__dirname, "temp"),
    })
    fs.copyFileSync(
        path.join(__dirname, "temp", "app", "RMBTClient-all.jar"),
        path.join(
            __dirname,
            "..",
            "src",
            "measurement",
            "java_client",
            "RMBTClient-all.jar",
        ),
    )
    fs.rmSync(path.join(__dirname, "temp"), { recursive: true, force: true })
    console.log("Java engine downloaded and extracted successfully.")
}

downloadJavaEngine()
