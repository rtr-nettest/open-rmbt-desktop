const path = require("path")
const fs = require("fs-extra")
const dotenv = require("dotenv")
const foldersToCopy = ["images", "styles"]

async function main() {
    const projectRoot = path.join(__dirname, "..", "..", "..")
    const dotenvConfig = path.join(projectRoot, ".env")
    console.log(`Loading .env file from ${dotenvConfig}`)
    dotenv.config({ path: dotenvConfig })
    const srcAssets = path.join(projectRoot, process.env.ASSETS_FOLDER)
    const dstAssets = path.join(__dirname, "..", "src", "assets")
    for (const folder of foldersToCopy) {
        if (!fs.existsSync(path.join(srcAssets, folder))) {
            continue
        }
        console.log(`Copying ${folder} from ${srcAssets} to ${dstAssets}...`)
        fs.copySync(path.join(srcAssets, folder), path.join(dstAssets, folder))
        console.log(`Done.`)
    }
    const srcSourceFiles = path.join(srcAssets, "src")
    const dstSourceFiles = path.join(__dirname, "..", "src")
    if (fs.existsSync(srcSourceFiles)) {
        console.log(`Copying ${srcSourceFiles} to ${dstSourceFiles}...`)
        fs.copySync(srcSourceFiles, dstSourceFiles)
        console.log(`Done.`)
    }
}

main()
