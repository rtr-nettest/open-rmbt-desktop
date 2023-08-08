// We're patching @electron-forge/maker-appx, because electron-windows-store does not support signing with hardware tokens

const {
    MakerAppX,
    createDefaultCertificate,
} = require("@electron-forge/maker-appx")
const { MakerBase } = require("@electron-forge/maker-base")
const path = require("path")
const zip = require("electron-windows-store/lib/zip")
const setup = require("electron-windows-store/lib/setup")
const sign = require("electron-windows-store/lib/sign")
const assets = require("electron-windows-store/lib/assets")
const convert = require("electron-windows-store/lib/convert")
const finalSay = require("electron-windows-store/lib/finalsay")
const makeappx = require("electron-windows-store/lib/makeappx")
const manifest = require("electron-windows-store/lib/manifest")
const deploy = require("electron-windows-store/lib/deploy")
const makepri = require("electron-windows-store/lib/makepri")
const { promisify } = require("util")
const { exec } = require("child_process")
const pExec = promisify(exec)

module.exports = function patchMakerAppX() {
    MakerAppX.prototype.ensureDirectory = MakerBase.prototype.ensureDirectory
    MakerAppX.prototype.normalizeWindowsVersion =
        MakerBase.prototype.normalizeWindowsVersion

    // Source: https://github.com/electron-userland/electron-windows-store/blob/7b45c54574596863b8c2f790cea09aabc03b6883/lib/index.js#L47
    MakerAppX.prototype.windowsStore = function windowsStore(program) {
        program.isModuleUse = true

        return setup(program)
            .then(() => zip(program))
            .then(() => convert(program))
            .then(() => assets(program))
            .then(() => manifest(program))
            .then(() => makepri(program))
            .then(() => finalSay(program))
            .then(() => makeappx(program))
            .then(() => {
                if (process.env.MS_STORE !== "true") {
                    return pExec(
                        `"${path.join(
                            program.windowsKit,
                            "signtool.exe"
                        )}" sign -fd SHA256 -v /a /t "http://time.certum.pl/" "${path.join(
                            program.outputDirectory,
                            program.packageName + ".appx"
                        )}"`
                    )
                } else {
                    return sign.signAppx(program)
                }
            })
            .then(() => deploy(program))
    }

    // Source: https://github.com/electron/forge/blob/48c67f3c80ea28ab26b6653f3c69dffb58a41d19/packages/maker/appx/src/MakerAppX.ts#L86
    MakerAppX.prototype.make = async function ({
        dir,
        makeDir,
        appName,
        packageJSON,
        targetArch,
    }) {
        const outPath = path.resolve(makeDir, `appx/${targetArch}`)
        await this.ensureDirectory(outPath)

        const opts = {
            flatten: false,
            deploy: false,
            packageVersion: `${packageJSON.version}.0`,
            packageName: packageJSON.name.replace(/-/g, ""),
            packageDisplayName: appName,
            packageDescription: packageJSON.description || appName,
            packageExecutable: `app\\${appName}.exe`,
            windowsKit: this.config.windowsKit,
            ...this.config,
            inputDirectory: dir,
            outputDirectory: outPath,
        }

        if (!opts.publisher) {
            throw new Error(
                "Please set config.forge.windowsStoreConfig.publisher or author.name in package.json for the appx target"
            )
        }

        if (
            !opts.devCert &&
            process.env.WINDOWS_PUBLISHER_IDENTITY === "CN=developmentca"
        ) {
            opts.devCert = await createDefaultCertificate(opts.publisher, {
                certFilePath: outPath,
                program: opts,
            })
        }

        if (opts.packageVersion.includes("-")) {
            if (opts.makeVersionWinStoreCompatible) {
                opts.packageVersion = this.normalizeWindowsVersion(
                    opts.packageVersion
                )
            } else {
                throw new Error(
                    "Windows Store version numbers don't support semver beta tags. To " +
                        "automatically fix this, set makeVersionWinStoreCompatible to true or " +
                        "explicitly set packageVersion to a version of the format X.Y.Z.A"
                )
            }
        }

        delete opts.makeVersionWinStoreCompatible

        await this.windowsStore(opts)

        return [path.resolve(outPath, `${opts.packageName}.appx`)]
    }
}
