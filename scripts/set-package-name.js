require("dotenv").config({
    path: process.env.RMBT_DESKTOP_DOTENV_CONFIG_PATH || ".env"
})
const fs = require("fs")
const pack = require("../package.json")
const { execSync } = require("child_process")

// Version is derived from the git tag at build time, not hardcoded in
// package.json (which stays at the "0.0.0-dev" placeholder). On a tagged commit
// `git describe` yields the clean tag (e.g. "2.1.2"); off-tag builds get a
// "2.1.2-5-g59b74d3" dev marker. Falls back to the package.json placeholder when
// no tag is reachable (shallow clone without tags, or not a git checkout).
function gitVersion() {
    try {
        const described = execSync("git describe --tags --always", {
            stdio: ["ignore", "pipe", "ignore"],
        })
            .toString()
            .trim()
        // Only accept a real tag-based describe (starts with an optional "v"
        // then a digit); a bare commit hash means no tag was found.
        const m = described.match(/^v?(\d.*)$/)
        return m ? m[1] : null
    } catch {
        return null
    }
}

function main() {
    pack.name = process.env.PACK_NAME || pack.name
    pack.productName = process.env.PACK_PRODUCT_NAME || pack.productName
    pack.description = process.env.PACK_DESCRIPTION || pack.description
    pack.author = process.env.PACK_AUTHOR || pack.author
    pack.version = gitVersion() || pack.version
    pack.gitInfo = {
        hash: execSync("git rev-parse HEAD").toString().trim(),
        branch: execSync("git rev-parse --abbrev-ref HEAD").toString().trim(),
    }
    fs.writeFileSync("package.json", JSON.stringify(pack, null, 4))
}

main()
