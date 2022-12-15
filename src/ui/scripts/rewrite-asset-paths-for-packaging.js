const fs = require("fs")
const path = require("path")

function main() {
    const distFolder = path.join(__dirname, "..", "dist", "ui")
    const files = fs.readdirSync(distFolder)
    const styleFile = files.find((f) => f.includes("styles."))
    if (styleFile) {
        console.log("Rewritting assets paths in", styleFile)
        let styleFileContent = fs
            .readFileSync(path.join(distFolder, styleFile))
            .toString()
        styleFileContent = styleFileContent.replace(
            "url(/assets/",
            "url(app://assets/"
        )
        fs.writeFileSync(path.join(distFolder, styleFile), styleFileContent)
        console.log("Done.")
    }
}

main()
