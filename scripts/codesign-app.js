const { exec } = require("child_process")
const { promisify } = require("util")
const fsp = require("fs/promises")
const fs = require("fs")
const path = require("path")
const plist = require("plist")
const packJson = require("../package.json")

let appsToSign = []

// Resolved per build from the requested arch (see codeSignApp); the Mac App
// Store build is arm64.
let outApp = null
let codesignArch = "arm64"

const outEntitlements = path.resolve(__dirname, "..", "out", "entitlements.xml")
const outChildEntitlements = path.resolve(
    __dirname,
    "..",
    "out",
    "entitlements.child.xml"
)

async function codeSignApp(entitlementsPath, provisionPath, arch = "arm64") {
    codesignArch = arch === "x64" ? "x86_64" : arch
    outApp = path.resolve(
        __dirname,
        "..",
        "out",
        `${packJson.productName}-mas-${arch}`
    )
    const plistUpdated = await updatePlist()
    if (!plistUpdated) {
        return
    }
    await updateEntitlements(entitlementsPath)
    await embedProvisionProfile(provisionPath)
    // Strip extended attributes from the whole app AFTER embedding the
    // provisioning profile. The downloaded .provisionprofile carries
    // com.apple.quarantine, and the native-client binaries carry resource
    // forks from the zip they are extracted from — both are rejected by Apple
    // (App Store error 91109 / codesign "resource fork … not allowed"). This
    // must run after embedProvisionProfile (which copies the profile in) and
    // before signing, so nothing re-adds an attribute afterwards.
    try {
        await promisify(exec)(`xattr -cr "${outApp}"`)
    } catch (e) {
        console.warn(e)
    }
    await collectAppsToSign(outApp)
    // The Rust measurement engine is a bare Mach-O binary (no .app/.framework/
    // .dylib extension), so collectAppsToSign does not pick it up. It must still
    // be signed with inherited (child) entitlements or the sandboxed app is
    // rejected / cannot launch it. The depth sort below keeps it a non-root
    // entry, so it gets the child entitlements.
    const rustBin = path.resolve(
        outApp,
        `${packJson.productName}.app`,
        "Contents",
        "Resources",
        "app",
        "dist",
        "rust_client",
        "rmbt-client"
    )
    if (fs.existsSync(rustBin)) {
        appsToSign.push(rustBin)
    }
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
    const appIdentifier = `${process.env.APPLE_TEAM_ID}.${process.env.APP_BUNDLE_ID}`
    parsedPlist["com.apple.application-identifier"] = appIdentifier
    // REQUIRED for the app to launch under the App Sandbox: Electron/Chromium
    // registers a Mach service named "<TeamID>.<BundleID>.MachPortRendezvousServer".
    // The sandbox only permits a Mach name inside one of the app's
    // application-group namespaces, so without this the app aborts immediately
    // with "bootstrap_check_in ... MachPortRendezvousServer: Permission denied".
    // The value must be exactly <TeamID>.<BundleID> (Electron MAS requirement).
    parsedPlist["com.apple.security.application-groups"] = [appIdentifier]
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
            `codesign -a ${codesignArch} -f --entitlements "${
                isRoot ? outEntitlements : outChildEntitlements
            }" -s "${process.env.APPLE_CODESIGN_IDENTITY}" "${path}" `
        )
    } catch (e) {
        console.warn(e)
    }
}

module.exports.codeSignApp = codeSignApp
