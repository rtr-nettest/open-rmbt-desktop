const { exec } = require("child_process")
const { promisify } = require("util")
const fsp = require("fs/promises")
const fs = require("fs")
const path = require("path")
const plist = require("plist")
const packJson = require("../package.json")

let appsToSign = []

const outApp = path.resolve(
    __dirname,
    "..",
    "out",
    `${packJson.productName}-mas-x64`
)

const outEntitlements = path.resolve(__dirname, "..", "out", "entitlements.xml")
const outChildEntitlements = path.resolve(
    __dirname,
    "..",
    "out",
    "entitlements.child.xml"
)

async function codeSignApp(entitlementsPath, provisionPath) {
    const plistUpdated = await updatePlist()
    if (!plistUpdated) {
        return
    }
    await updateEntitlements(entitlementsPath)
    await embedProvisionProfile(provisionPath)
    await collectAppsToSign(outApp)
    appsToSign = appsToSign.sort(
        (a, b) => b.split("/").length - a.split("/").length
    )
    console.log("Apps to sign", appsToSign)
    for (let i = 0; i < appsToSign.length; i++) {
        const app = appsToSign[i]
        if (i === appsToSign.length - 1) {
            await sign(app, true)
        } else {
            await sign(app)
        }
    }
}

async function updatePlist() {
    const filePath = path.resolve(
        outApp,
        `${packJson.productName}.app`,
        "Contents",
        "Info.plist"
    )
    if (!fs.existsSync(filePath)) {
        return false
    }
    const plistFile = (await fsp.readFile(filePath)).toString()
    const parsedPlist = plist.parse(plistFile)
    console.log("parsedPlist", parsedPlist)
    parsedPlist["ElectronTeamID"] = process.env.APPLE_TEAM_ID
    parsedPlist["ITSAppUsesNonExemptEncryption"] = false
    await fsp.writeFile(filePath, plist.build(parsedPlist))
    return true
}

async function embedProvisionProfile(provisionPath) {
    const filePath = path.resolve(
        outApp,
        `${packJson.productName}.app`,
        "Contents",
        "embedded.provisionprofile"
    )
    const promiseExec = promisify(exec)
    try {
        await promiseExec(`cp ${provisionPath} ${filePath}`)
    } catch (e) {
        console.warn(e)
    }
}

async function updateEntitlements(filePath) {
    const plistFile = (await fsp.readFile(filePath)).toString()
    const parsedPlist = plist.parse(plistFile)
    console.log("parsedPlist", parsedPlist)
    const bundleId = `${process.env.APPLE_TEAM_ID}.${process.env.APP_BUNDLE_ID}`
    parsedPlist["com.apple.application-identifier"] = bundleId
    parsedPlist["com.apple.security.application-groups"] = [bundleId]
    await fsp.writeFile(outEntitlements, plist.build(parsedPlist))
    for (const key in parsedPlist) {
        if (key !== "com.apple.security.app-sandbox") {
            delete parsedPlist[key]
        }
    }
    parsedPlist["com.apple.security.inherit"] = true
    await fsp.writeFile(outChildEntitlements, plist.build(parsedPlist))
}

async function collectAppsToSign(filePath) {
    const dir = await fsp.readdir(filePath)
    for (const file of dir) {
        const fullPathToFile = path.resolve(filePath, file)
        const isAppOrFramework = /\.(app|framework|dylib)$/.test(file)
        const isDirectory = (await fsp.stat(fullPathToFile)).isDirectory()
        if (isAppOrFramework) {
            appsToSign.push(fullPathToFile)
        }
        if (isDirectory) {
            await collectAppsToSign(fullPathToFile)
        }
    }
}

async function sign(path, isRoot) {
    const promiseExec = promisify(exec)
    try {
        await promiseExec(
            `codesign -a x86_64 -f --entitlements "${
                isRoot ? outEntitlements : outChildEntitlements
            }" -s "${process.env.APPLE_CODESIGN_IDENTITY}" "${path}" `
        )
    } catch (e) {
        console.warn(e)
    }
}

module.exports.codeSignApp = codeSignApp
