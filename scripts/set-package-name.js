require("dotenv").config({
    path: process.env.RMBT_DESKTOP_DOTENV_CONFIG_PATH || ".env"
})
const fs = require("fs")
const pack = require("../package.json")
const { execSync } = require("child_process")

// The build version is derived from the git tag, not hardcoded in package.json
// (which stays at the "0.0.0-dev" placeholder). It MUST be a pure semantic
// version "Major.Minor.Patch": electron-forge's Windows maker feeds it to a
// NuGet/Squirrel .nuspec, which rejects anything else (e.g. the git-describe
// dev marker "2.1.3-1-g0bcc595" -> "not a valid version string"). So we extract
// only the numeric MAJOR.MINOR.PATCH from the nearest tag (padding a missing
// patch with 0); the full describe string and commit are preserved in gitInfo
// (and surfaced via GIT_INFO) for traceability.
function gitDescribe() {
    try {
        return execSync("git describe --tags --always", {
            stdio: ["ignore", "pipe", "ignore"],
        })
            .toString()
            .trim()
    } catch {
        return ""
    }
}

function pureSemver(describe) {
    // "v2.1.3" / "v2.1.3-1-g0bcc595" -> "2.1.3"; "v2.1" -> "2.1.0".
    const m = describe.match(/(\d+)\.(\d+)(?:\.(\d+))?/)
    return m ? `${m[1]}.${m[2]}.${m[3] ?? "0"}` : null
}

function main() {
    pack.name = process.env.PACK_NAME || pack.name
    pack.productName = process.env.PACK_PRODUCT_NAME || pack.productName
    pack.description = process.env.PACK_DESCRIPTION || pack.description
    pack.author = process.env.PACK_AUTHOR || pack.author
    const describe = gitDescribe()
    // Always a pure semver for the packagers; "0.0.0" only if no tag is reachable
    // (shallow clone without tags, or not a git checkout).
    pack.version = pureSemver(describe) || "0.0.0"
    pack.gitInfo = {
        hash: execSync("git rev-parse HEAD").toString().trim(),
        branch: execSync("git rev-parse --abbrev-ref HEAD").toString().trim(),
        describe,
    }
    fs.writeFileSync("package.json", JSON.stringify(pack, null, 4))
}

main()
