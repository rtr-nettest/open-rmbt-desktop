const path = require("path")
const fs = require("fs")
const Dotenv = require("dotenv-webpack")
const CopyPlugin = require("copy-webpack-plugin")

// copy-webpack-plugin emits copied files with default (non-executable) mode, so
// the bundled native measurement clients (rust_client/c_client) lose their +x
// bit and can't be spawned from the packaged app. Restore it after emit so the
// binaries are executable in dist/ before electron-forge packages (and signs)
// them; otherwise engine detection falls back to the JavaScript engine.
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
                    const bin = path.join(outDir, sub, exe)
                    try {
                        if (fs.existsSync(bin)) fs.chmodSync(bin, 0o755)
                    } catch (e) {
                        compilation.warnings.push(
                            new Error(
                                `Could not chmod +x ${bin}: ${e.message}`
                            )
                        )
                    }
                }
            }
        )
    }
}

const baseConfig = {
    node: {
        __dirname: false,
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
                {
                    // Native C measurement client binary (no Windows build).
                    // Populated per-platform in CI; may be empty locally, so
                    // tolerate a missing/empty directory.
                    from: "src/measurement/c_client",
                    to: "c_client",
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
