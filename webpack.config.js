const path = require("path")
const fs = require("fs")
const Dotenv = require("dotenv-webpack")
const CopyPlugin = require("copy-webpack-plugin")

// copy-webpack-plugin emits copied files with default (non-executable) mode, so
// the bundled measurement clients lose their +x bit and can't be spawned from
// the packaged app. Restore it after emit so they are executable in dist/ before
// electron-forge packages (and signs) them; otherwise engine detection falls
// back to the JavaScript engine.
//   - rust_client / c_client: a single `rmbt-client` binary.
//   - java_client: a jpackage app-image bundling a whole JRE, i.e. many
//     executables (launcher, runtime bin/*, jspawnhelper). We can't know which
//     files were executable after the copy, so we restore +x on the entire tree
//     (marking a data file executable is harmless).
function chmodExecFile(file, compilation) {
    try {
        if (fs.existsSync(file)) fs.chmodSync(file, 0o755)
    } catch (e) {
        compilation.warnings.push(new Error(`Could not chmod +x ${file}: ${e.message}`))
    }
}

function chmodTreeExec(dir, compilation) {
    let entries
    try {
        entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
        return
    }
    for (const entry of entries) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) chmodTreeExec(full, compilation)
        else if (entry.isFile()) chmodExecFile(full, compilation)
    }
}

class MakeNativeClientsExecutablePlugin {
    apply(compiler) {
        compiler.hooks.afterEmit.tap(
            "MakeNativeClientsExecutable",
            (compilation) => {
                const outDir = compiler.options.output.path
                const exe =
                    process.platform === "win32"
                        ? "rmbt-client.exe"
                        : "rmbt-client"
                for (const sub of ["rust_client", "c_client"]) {
                    chmodExecFile(path.join(outDir, sub, exe), compilation)
                }
                const javaDir = path.join(outDir, "java_client")
                if (fs.existsSync(javaDir)) chmodTreeExec(javaDir, compilation)
            }
        )
    }
}

const baseConfig = {
    node: {
        __dirname: false,
    },
    // Never bundle the "electron" npm package. It is provided by the runtime in
    // the main/preload processes; bundling its shim (index.js) into the
    // Node-target worker is catastrophic — the shim self-spawns process.execPath
    // to "download Electron", which relaunches the packaged app in a fork bomb.
    externals: {
        electron: "commonjs2 electron",
    },
    module: {
        noParse: /sql.js/,
        rules: [
            {
                test: /\.node$/,
                loader: "node-loader",
            },
            {
                test: /\.tsx?$/,
                exclude: /(node_modules|\.webpack)/,
                use: {
                    loader: "ts-loader",
                    options: {
                        transpileOnly: true,
                    },
                },
            },
        ],
    },
    resolve: {
        extensions: [".js", ".ts", ".jsx", ".tsx", ".css", ".json"],
    },
    plugins: [
        new Dotenv(),
        new CopyPlugin({
            patterns: [
                {
                    from: "./node_modules/sql.js/dist/sql-wasm.wasm",
                },
                {
                    from: "src/measurement/services/migrations",
                    to: "migrations",
                },
                {
                    // Native Rust measurement client binary, bundled as a static
                    // file (mirrors the former java_client packaging). Copied next
                    // to dist/main.js so it resolves via __dirname at runtime.
                    from: "src/measurement/rust_client",
                    to: "rust_client",
                },
                // Native C measurement client binary (no Windows build).
                // Excluded on macOS: the published macOS C binary is dynamically
                // linked against Homebrew libcurl/openssl (absolute /opt/homebrew
                // paths), so it can't run on end-user Macs — Rust/JS are used
                // there instead. Populated per-platform in CI; may be empty
                // locally, so tolerate a missing/empty directory.
                ...(process.platform === "darwin"
                    ? []
                    : [
                          {
                              from: "src/measurement/c_client",
                              to: "c_client",
                              noErrorOnMissing: true,
                          },
                      ]),
                {
                    // Bundled Java measurement client: a jpackage app-image with
                    // its own JRE. Published only for some platforms (macOS/arm64,
                    // Windows/x64, Linux/x64) and populated per-platform in CI, so
                    // tolerate a missing/empty directory. Its executables' +x bit
                    // is restored by MakeNativeClientsExecutablePlugin.
                    from: "src/measurement/java_client",
                    to: "java_client",
                    noErrorOnMissing: true,
                },
            ],
        }),
        new MakeNativeClientsExecutablePlugin(),
    ],
}

module.exports = [
    {
        ...baseConfig,
        entry: "./src/electron/electron.ts",
        output: {
            path: path.join(__dirname, "dist"),
            filename: "main.js",
        },
        target: "electron-main",
    },
    {
        ...baseConfig,
        entry: "./src/electron/preload.ts",
        output: {
            path: path.join(__dirname, "dist"),
            filename: "preload.js",
        },
        target: "electron-preload",
    },
    {
        ...baseConfig,
        entry: "./src/measurement/services/worker.service.ts",
        output: {
            path: path.join(__dirname, "dist"),
            filename: "worker.service.js",
        },
        target: "node",
    },
]
